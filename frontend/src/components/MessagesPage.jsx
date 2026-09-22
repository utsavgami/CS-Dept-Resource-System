import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../lib/apiClient';
import { io } from 'socket.io-client';
import { MessageSquare, Send, Sparkles, ShieldCheck, Plus, Search, X } from 'lucide-react';

// A conversation is either:
//  - booking chat : { booking, isDirect: false, participant, lastMessage, unreadCount }
//  - direct chat  : { booking: null, isDirect: true, participant, lastMessage, unreadCount }
const convKey = (c) => (c.isDirect ? `direct:${c.participant._id}` : `booking:${c.booking._id}`);

export const MessagesPage = ({
  currentUser,
  initialBookingId,
  initialDirectUserId
}) => {
  const isAdmin = currentUser?.role === 'admin';

  const [conversations, setConversations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputContent, setInputContent] = useState('');
  const [loading, setLoading] = useState(true);

  // Admin "New Message" picker
  const [showNew, setShowNew] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentQuery, setStudentQuery] = useState('');

  const socketRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const selectedRef = useRef(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    // Target chat can come from props, or from a notification click (Navbar
    // stores it in sessionStorage before switching to this tab).
    let target = { booking: initialBookingId, direct: initialDirectUserId };
    try {
      const stored = sessionStorage.getItem('chat_target');
      if (stored) {
        target = JSON.parse(stored);
        sessionStorage.removeItem('chat_target');
      }
    } catch {
      // ignore
    }
    loadConversations(target);

    // Notification clicked while this page is already open
    const onOpenChat = (e) => loadConversations(e.detail || {});
    window.addEventListener('open-chat', onOpenChat);

    // Connect Socket.io client (booking chats are real-time)
    const socket = io();
    socketRef.current = socket;

    socket.on('receive_chat_message', (newMsg) => {
      // Ignore booking-room messages while a direct chat is open
      const current = selectedRef.current;
      if (current?.isDirect) return;

      setMessages(prev => {
        if (prev.some(m => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });
      scrollToBottom();
    });

    return () => {
      window.removeEventListener('open-chat', onOpenChat);
      socket.disconnect();
    };
  }, []);

  // Direct chats have no socket room on the server, so refresh the open
  // thread every few seconds to pick up replies.
  useEffect(() => {
    if (!selected?.isDirect) return;
    const otherId = selected.participant._id;

    const timer = setInterval(async () => {
      try {
        const res = await api.getDirectThread(otherId);
        const fresh = res.messages || [];
        setMessages(prev => {
          if (prev.length === fresh.length && prev[prev.length - 1]?._id === fresh[fresh.length - 1]?._id) {
            return prev;
          }
          scrollToBottom();
          return fresh;
        });
      } catch {
        // ignore
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [selected]);

  const loadConversations = async (target = {}) => {
    try {
      setLoading(true);
      const res = await api.getConversations();
      const list = res.conversations || [];
      setConversations(list);

      if (target.booking) {
        const found = list.find(c => !c.isDirect && c.booking?._id === target.booking);
        if (found) {
          selectConversation(found);
          return;
        }
      }
      if (target.direct) {
        const found = list.find(c => c.isDirect && c.participant._id === target.direct);
        if (found) {
          selectConversation(found);
          return;
        }
      }
      if (list.length > 0) selectConversation(list[0]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv) => {
    setSelected(conv);
    setShowNew(false);
    setMessages([]);

    try {
      if (conv.isDirect) {
        const res = await api.getDirectThread(conv.participant._id);
        setMessages(res.messages || []);
      } else {
        const res = await api.getMessages(conv.booking._id);
        setMessages(res.messages || []);

        // Join Socket room
        if (socketRef.current) {
          socketRef.current.emit('join_booking_room', conv.booking._id);
        }
      }

      // Opening a thread marks it read on the server
      const key = convKey(conv);
      setConversations(prev => prev.map(c => (convKey(c) === key ? { ...c, unreadCount: 0 } : c)));
      scrollToBottom();
    } catch {
      // ignore
    }
  };

  const scrollToBottom = () => {
    // Scroll only the chat message list itself, not the whole page.
    setTimeout(() => {
      const el = messagesContainerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 100);
  };

  const touchConversation = (conv, msg) => {
    const key = convKey(conv);
    setConversations(prev => {
      const exists = prev.some(c => convKey(c) === key);
      const updated = exists
        ? prev.map(c => (convKey(c) === key ? { ...c, lastMessage: msg, lastActivityAt: msg.timestamp } : c))
        : [{ ...conv, lastMessage: msg, lastActivityAt: msg.timestamp }, ...prev];
      return [...updated].sort((a, b) => new Date(b.lastActivityAt || 0) - new Date(a.lastActivityAt || 0));
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputContent.trim() || !selected) return;

    const content = inputContent.trim();
    setInputContent('');

    // ---- Direct (admin <-> student) chat: REST only ----
    if (selected.isDirect) {
      try {
        const res = await api.sendDirectMessage({
          receiverId: selected.participant._id,
          content
        });
        setMessages(prev => {
          if (prev.some(m => m._id === res.message._id)) return prev;
          return [...prev, res.message];
        });
        touchConversation(selected, res.message);
        scrollToBottom();
      } catch (err) {
        alert(err.message || 'Failed to send message');
      }
      return;
    }

    // ---- Booking chat ----
    const booking = selected.booking;

    const receiverId = booking.borrowerId === currentUser._id
      ? booking.ownerId
      : booking.borrowerId;

    const receiverName = booking.borrowerId === currentUser._id
      ? booking.ownerName
      : booking.borrowerName;

    // Prefer Socket.io for real-time delivery. The server broadcasts the
    // saved message back to everyone in the room (including the sender),
    // so we don't add it locally here. Only fall back to REST if the socket
    // isn't connected, to avoid creating two messages for a single send.
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('send_chat_message', {
        bookingId: booking._id,
        senderId: currentUser._id,
        senderName: currentUser.name,
        receiverId,
        receiverName,
        content
      });
      return;
    }

    try {
      const res = await api.sendMessage({
        bookingId: booking._id,
        content
      });

      setMessages(prev => {
        if (prev.some(m => m._id === res.message._id)) return prev;
        return [...prev, res.message];
      });
      touchConversation(selected, res.message);
      scrollToBottom();
    } catch (err) {
      alert(err.message || 'Failed to send message');
    }
  };

  // ---- Admin: start a new message with any student ----
  const openNewMessage = async () => {
    setShowNew(true);
    setStudentQuery('');
    if (students.length === 0) {
      try {
        const res = await api.getAdminUsers();
        setStudents((res.users || []).filter(u => u.role !== 'admin'));
      } catch {
        // ignore
      }
    }
  };

  const startChatWith = (student) => {
    const existing = conversations.find(c => c.isDirect && c.participant._id === student._id);
    if (existing) {
      selectConversation(existing);
      return;
    }
    const fresh = {
      booking: null,
      isDirect: true,
      participant: { _id: student._id, name: student.name, avatar: student.avatar || null },
      lastMessage: null,
      unreadCount: 0,
      lastActivityAt: null
    };
    // Show it in the list only once a message is actually sent
    setSelected(fresh);
    setMessages([]);
    setShowNew(false);
  };

  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return students.slice(0, 30);
    return students
      .filter(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q) ||
        (s.enrollmentNumber || '').toLowerCase().includes(q)
      )
      .slice(0, 30);
  }, [students, studentQuery]);

  // ---- Header helpers ----
  const headerTitle = selected
    ? selected.isDirect
      ? (isAdmin ? selected.participant.name : 'CS Admin')
      : selected.booking.itemTitle
    : '';

  const otherPartyName = selected
    ? selected.isDirect
      ? selected.participant.name
      : (selected.booking.ownerId === currentUser._id ? selected.booking.borrowerName : selected.booking.ownerName)
    : '';

  return (
    <div className="py-6 space-y-6 animate-in fade-in">

      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Real-Time Chat & Discussion
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Coordinate pickup times, CS lab locations, and rental details with peer students — or message the CS Admin anytime
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[550px]">

        {/* Left Col: Conversation List */}
        <div className="border-r border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              <span>My Chats</span>
            </h3>

            {isAdmin && (
              <button
                onClick={showNew ? () => setShowNew(false) : openNewMessage}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold flex items-center space-x-1 transition"
              >
                {showNew ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                <span>{showNew ? 'Close' : 'New Message'}</span>
              </button>
            )}
          </div>

          {/* Admin: student picker */}
          {isAdmin && showNew && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  placeholder="Search student by name, email, enrollment..."
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredStudents.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">No students found</p>
                ) : (
                  filteredStudents.map(s => (
                    <div
                      key={s._id}
                      onClick={() => startChatWith(s)}
                      className="px-2.5 py-2 rounded-xl cursor-pointer text-xs hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                    >
                      <p className="font-bold line-clamp-1">{s.name}</p>
                      <p className="text-[10px] text-slate-400 line-clamp-1">{s.enrollmentNumber || s.email}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {loading ? (
              <p className="text-xs text-slate-400 text-center py-10">Loading chats...</p>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">
                {isAdmin
                  ? 'No chats yet — use "New Message" to start one with any student'
                  : 'No active chats available — chat opens once a booking is accepted'}
              </p>
            ) : (
              conversations.map((c) => {
                const isSelected = selected && convKey(selected) === convKey(c);
                const preview = c.lastMessage?.content;

                if (c.isDirect) {
                  return (
                    <div
                      key={convKey(c)}
                      onClick={() => selectConversation(c)}
                      className={`p-3 rounded-2xl cursor-pointer transition border text-xs space-y-1 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold line-clamp-1 flex items-center space-x-1.5">
                          <ShieldCheck className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-blue-500'}`} />
                          <span>{isAdmin ? c.participant.name : 'CS Admin'}</span>
                        </span>
                        {c.unreadCount > 0 && !isSelected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-bold">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className={`text-[11px] line-clamp-1 ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {preview || (isAdmin ? 'Direct message' : 'Message the admin anytime')}
                      </p>
                    </div>
                  );
                }

                const b = c.booking;
                const isOwner = b.ownerId === currentUser._id;
                const otherName = isOwner ? b.borrowerName : b.ownerName;

                return (
                  <div
                    key={convKey(c)}
                    onClick={() => selectConversation(c)}
                    className={`p-3 rounded-2xl cursor-pointer transition border text-xs space-y-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold line-clamp-1">{b.itemTitle}</span>
                      <span className="flex items-center space-x-1">
                        {c.unreadCount > 0 && !isSelected && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-600 text-white font-bold">
                            {c.unreadCount}
                          </span>
                        )}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {b.status}
                        </span>
                      </span>
                    </div>

                    <p className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {isOwner ? 'Borrower:' : 'Lender:'} {otherName}
                    </p>
                    {preview && (
                      <p className={`text-[11px] line-clamp-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                        {preview}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 2 Cols: Chat Window */}
        <div className="md:col-span-2 flex flex-col justify-between p-4 bg-white dark:bg-slate-900">

          {selected ? (
            <>
              {/* Chat Header */}
              <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                    {selected.isDirect && <ShieldCheck className="w-4 h-4 text-blue-500" />}
                    <span>{headerTitle}</span>
                    {!selected.isDirect && (
                      <span className="text-xs font-normal text-slate-400">(₹{selected.booking.rentPricePerDay}/day)</span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selected.isDirect && !isAdmin ? 'Direct chat with ' : 'Chatting with '}
                    <strong className="text-slate-800 dark:text-slate-200">{otherPartyName}</strong>
                  </p>
                </div>
                {!selected.isDirect && (
                  <div className="text-right text-[11px] text-slate-400">
                    <span>Dates: {selected.booking.startDate} - {selected.booking.endDate}</span>
                  </div>
                )}
              </div>

              {/* Message Bubble Container */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto my-4 space-y-3 p-2 max-h-[380px]">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <Sparkles className="w-8 h-8 text-blue-500 mx-auto opacity-50" />
                    <p className="text-xs">
                      {selected.isDirect
                        ? (isAdmin
                            ? 'No messages yet. Send the first message to this student.'
                            : 'No messages yet. Ask the CS Admin anything — complaints, account issues, listings.')
                        : 'No message history yet. Start discussing pickup details on campus!'}
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === currentUser._id;
                    const senderLabel = m.senderName || (isMe ? currentUser.name : otherPartyName);
                    return (
                      <div
                        key={m._id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                          {senderLabel} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div
                          className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-bl-none'
                          }`}
                        >
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendMessage} className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2">
                <input
                  type="text"
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder={
                    selected.isDirect
                      ? (isAdmin ? 'Write a message to this student...' : 'Write a message to the CS Admin...')
                      : 'Type message regarding pickup time, lab room, deposit...'
                  }
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!inputContent.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center space-x-1"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3 py-20">
              <MessageSquare className="w-12 h-12 text-slate-300" />
              <p className="text-xs">Select a conversation on the left to open chat.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};