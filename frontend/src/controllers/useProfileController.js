import { useEffect, useState } from 'react';
import { api, setStoredUser } from '../lib/apiClient';

// Controller for ProfilePage: network/state decisions live here; the component
// remains the view that renders fields and forwards user events.
export function useProfileController({ currentUser, onUserUpdated }) {
  const [profileStats, setProfileStats] = useState({
    listingsCount: 0, borrowedCount: 0, favoritesCount: 0, ratings: []
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({
    name: currentUser.name,
    mobileNumber: currentUser.mobileNumber,
    semester: currentUser.semester,
    avatar: currentUser.avatar || ''
  }));
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    setForm({ name: currentUser.name, mobileNumber: currentUser.mobileNumber, semester: currentUser.semester, avatar: currentUser.avatar || '' });
  }, [currentUser]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [profile, favorites] = await Promise.all([
          api.getUserProfile(currentUser._id), api.getFavorites().catch(() => ({ items: [] }))
        ]);
        setProfileStats({
          listingsCount: profile.listingsCount || 0,
          borrowedCount: profile.borrowedCount || 0,
          favoritesCount: (favorites.items || []).length,
          ratings: profile.ratings || []
        });
      } catch {
        // The profile can still render from the authenticated user object.
      } finally { setLoading(false); }
    }
    load();
  }, [currentUser._id]);

  async function saveProfile(event) {
    event.preventDefault();
    try {
      setUpdating(true);
      const { user } = await api.updateProfile(form);
      setStoredUser(user);
      onUserUpdated(user);
      setEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      alert(error.message || 'Failed to update profile');
    } finally { setUpdating(false); }
  }

  return { profileStats, loading, editing, setEditing, form, setForm, updating, saveProfile };
}
