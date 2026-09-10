import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/apiClient';
import { io } from 'socket.io-client';
import { MessageSquare, Send, User as UserIcon, Calendar, MapPin, Laptop, Sparkles } from 'lucide-react';

export const MessagesPage = ({
  currentUser,
  initialBookingId
}) => {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputContent, setInputContent] = useState('');
  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadBookings();

    // Connect Socket.io client
    const socket = io();
    socketRef.current = socket;

    socket.on('receive_chat_message', (newMsg) => {
      setMessages(prev => {
        if (prev.some(m => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });
      scrollToBottom();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      const res = await api.getMyBookings();
      const allBookings = [...(res.borrowed || []), ...(res.ownerRequests || [])];
      setBookings(allBookings);

      if (initialBookingId) {
        const found = allBookings.find(b => b._id === initialBookingId);
        if (found) selectConversation(found);
      } else if (allBookings.length > 0) {
        selectConversation(allBookings[0]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (booking) => {
    setSelectedBooking(booking);
    try {
      const res = await api.getMessages(booking._id);
      setMessages(res.messages || []);

      // Join Socket room
      if (socketRef.current) {
        socketRef.current.emit('join_booking_room', booking._id);
      }
      scrollToBottom();
    } catch {
      // ignore
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputContent.trim() || !selectedBooking) return;

    const content = inputContent.trim();
    setInputContent('');

    const receiverId = selectedBooking.borrowerId === currentUser._id
      ? selectedBooking.ownerId
      : selectedBooking.borrowerId;

    const receiverName = selectedBooking.borrowerId === currentUser._id
      ? selectedBooking.ownerName
      : selectedBooking.borrowerName;

    // Emit via Socket.io
    if (socketRef.current) {
      socketRef.current.emit('send_chat_message', {
        bookingId: selectedBooking._id,
        senderId: currentUser._id,
        senderName: currentUser.name,
        receiverId,
        receiverName,
        content
      });
    }

    // Fallback REST API call
    try {
      const res = await api.sendMessage({
        bookingId: selectedBooking._id,
        content
      });

      setMessages(prev => {
        if (prev.some(m => m._id === res.message._id)) return prev;
        return [...prev, res.message];
      });
      scrollToBottom();
    } catch {
      // ignore socket already broadcasted
    }
  };

  return (
    <div className="py-6 space-y-6 animate-in fade-in">

      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Real-Time Chat & Discussion
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Coordinate pickup times, CS lab locations, and rental details with peer students via Socket.io
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-3 min-h-[550px]">

        {/* Left Col: Conversation List */}
        <div className="border-r border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
            <span>Booking Discussions</span>
          </h3>

          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {bookings.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10">No active chats available</p>
            ) : (
              bookings.map((b) => {
                const isOwner = b.ownerId === currentUser._id;
                const otherName = isOwner ? b.borrowerName : b.ownerName;
                const isSelected = selectedBooking?._id === b._id;

                return (
                  <div
                    key={b._id}
                    onClick={() => selectConversation(b)}
                    className={`p-3 rounded-2xl cursor-pointer transition border text-xs space-y-1 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold line-clamp-1">{b.itemTitle}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <p className={`text-[11px] ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {isOwner ? 'Borrower:' : 'Lender:'} {otherName}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 2 Cols: Chat Window */}
        <div className="md:col-span-2 flex flex-col justify-between p-4 bg-white dark:bg-slate-900">

          {selectedBooking ? (
            <>
              {/* Chat Header */}
              <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                    <span>{selectedBooking.itemTitle}</span>
                    <span className="text-xs font-normal text-slate-400">(${selectedBooking.rentPricePerDay}/day)</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chatting with <strong className="text-slate-800 dark:text-slate-200">
                      {selectedBooking.ownerId === currentUser._id ? selectedBooking.borrowerName : selectedBooking.ownerName}
                    </strong>
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <span>Dates: {selectedBooking.startDate} - {selectedBooking.endDate}</span>
                </div>
              </div>

              {/* Message Bubble Container */}
              <div className="flex-1 overflow-y-auto my-4 space-y-3 p-2 max-h-[380px]">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <Sparkles className="w-8 h-8 text-blue-500 mx-auto opacity-50" />
                    <p className="text-xs">No message history yet. Start discussing pickup details on campus!</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isMe = m.senderId === currentUser._id;
                    return (
                      <div
                        key={m._id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                          {m.senderName} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendMessage} className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2">
                <input
                  type="text"
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder="Type message regarding pickup time, lab room, deposit..."
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
              <p className="text-xs">Select a booking conversation on the left to open real-time chat.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
