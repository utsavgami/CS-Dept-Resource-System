import React from 'react';

// Deterministic accent so the same name always lands on the same tone —
// no randomness, no external avatar service, no flicker on re-render.
const AVATAR_TONES = [
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-500 to-purple-600',
  'from-cyan-500 to-blue-600'
];

export function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
}

function toneForName(name = '') {
  const sum = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_TONES[sum % AVATAR_TONES.length];
}

// src: a URL (uploaded avatar path, or an objectURL preview of a picked file).
// name: used both for initials and to pick a deterministic gradient tone.
export const Avatar = ({ src, name, size = 'w-24 h-24', textSize = 'text-2xl' }) => {
  if (src) {
    return (
      <img
        src={src}
        alt={name || 'Profile photo'}
        className={`${size} rounded-full object-cover border-4 border-blue-500/20 shadow-md transition-transform duration-200 hover:scale-105`}
      />
    );
  }
  return (
    <div
      className={`${size} rounded-full border-4 border-blue-500/20 shadow-md bg-gradient-to-br ${toneForName(name)} flex items-center justify-center text-white font-black ${textSize} transition-transform duration-200 hover:scale-105`}
      aria-label={name || 'Profile photo'}
    >
      {getInitials(name)}
    </div>
  );
};