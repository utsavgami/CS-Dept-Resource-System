import { useEffect, useState } from 'react';
import { api, setStoredUser } from '../lib/apiClient';

// Drives ProfilePage: loads profile stats/ratings, handles the edit form,
// and handles profile-photo upload + removal (both persisted server-side).
export function useProfileController({ currentUser, onUserUpdated }) {
  const [profileStats, setProfileStats] = useState({ listingsCount: 0, borrowedCount: 0, ratings: [] });
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: currentUser?.name || '',
    mobileNumber: currentUser?.mobileNumber || '',
    semester: currentUser?.semester || '1st Semester',
    avatar: currentUser?.avatar || null
  });
  const [updating, setUpdating] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageMessage, setImageMessage] = useState(null);

  // Load profile stats whenever the viewed user changes.
  useEffect(() => {
    if (!currentUser?._id) return;
    let cancelled = false;

    setLoading(true);
    api.getUserProfile(currentUser._id)
      .then((data) => {
        if (cancelled) return;
        setProfileStats({
          listingsCount: data.listingsCount || 0,
          borrowedCount: data.borrowedCount || 0,
          ratings: data.ratings || []
        });
        setForm((prev) => ({ ...prev, avatar: data.user?.avatar ?? prev.avatar }));
      })
      .catch((err) => console.error('Could not load profile stats:', err.message))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?._id]);

  // Keep the edit form in sync if the user object changes from outside
  // (e.g. another tab, or a fresh login) while not actively editing.
  useEffect(() => {
    if (editing) return;
    setForm({
      name: currentUser?.name || '',
      mobileNumber: currentUser?.mobileNumber || '',
      semester: currentUser?.semester || '1st Semester',
      avatar: currentUser?.avatar || null
    });
  }, [currentUser, editing]);

  const applyUpdatedUser = (updatedUser) => {
    setStoredUser(updatedUser);
    onUserUpdated && onUserUpdated(updatedUser);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);
      const res = await api.updateProfile({
        name: form.name,
        mobileNumber: form.mobileNumber,
        semester: form.semester
      });
      applyUpdatedUser(res.user);
      setEditing(false);
    } catch (err) {
      console.error('Could not update profile:', err.message);
      setImageMessage({ type: 'error', text: err.message || 'Could not save changes' });
    } finally {
      setUpdating(false);
    }
  };

  const uploadProfileImage = async (file) => {
    if (!file) return;
    setUploadingImage(true);
    setImageMessage(null);
    try {
      const res = await api.uploadProfileImage(file);
      setForm((prev) => ({ ...prev, avatar: res.user.avatar }));
      applyUpdatedUser(res.user);
      setImageMessage({ type: 'success', text: 'Profile photo updated' });
    } catch (err) {
      setImageMessage({ type: 'error', text: err.message || 'Could not upload photo' });
    } finally {
      setUploadingImage(false);
    }
  };

  const removeProfileImage = async () => {
    setUploadingImage(true);
    setImageMessage(null);
    try {
      const res = await api.removeProfileImage();
      setForm((prev) => ({ ...prev, avatar: null }));
      applyUpdatedUser(res.user);
      setImageMessage({ type: 'success', text: 'Profile photo removed' });
    } catch (err) {
      setImageMessage({ type: 'error', text: err.message || 'Could not remove photo' });
    } finally {
      setUploadingImage(false);
    }
  };

  return {
    profileStats,
    loading,
    editing,
    setEditing,
    form,
    setForm,
    updating,
    saveProfile,
    uploadingImage,
    imageMessage,
    uploadProfileImage,
    removeProfileImage
  };
}