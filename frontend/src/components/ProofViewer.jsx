import React, { useEffect, useState } from 'react';
import { fetchProtectedFile } from '../lib/apiClient';

// Complaint proofs are login-protected, so a plain <img src> can't load them.
// These helpers fetch the file with the login token and show it from memory.

// Small inline preview. Shows the image; for a PDF shows a short label.
export function ProofImage({ url, alt = 'Proof', className = '' }) {
  const [objectUrl, setObjectUrl] = useState('');
  const [isPdf, setIsPdf] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked = false;
    let created = '';
    setObjectUrl('');
    setFailed(false);
    fetchProtectedFile(url)
      .then((blob) => {
        if (revoked) return;
        setIsPdf(blob.type === 'application/pdf');
        created = URL.createObjectURL(blob);
        setObjectUrl(created);
      })
      .catch(() => !revoked && setFailed(true));
    return () => {
      revoked = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [url]);

  if (failed) {
    return <div className={`${className} flex items-center justify-center text-[10px] text-slate-400 border border-dashed border-slate-300`}>Unavailable</div>;
  }
  if (!objectUrl) {
    return <div className={`${className} bg-slate-200/60 dark:bg-slate-800/60 animate-pulse`} />;
  }
  if (isPdf) {
    return <div className={`${className} flex items-center justify-center text-[10px] font-bold text-slate-500 border border-slate-300`}>PDF</div>;
  }
  return <img src={objectUrl} alt={alt} className={className} />;
}

// Link/button that opens the proof in a new tab (image or PDF).
export function ProofLink({ url, className = '', children }) {
  const [busy, setBusy] = useState(false);

  const open = async (e) => {
    e.preventDefault();
    if (busy) return;
    // Open the tab right away (inside the click) so pop-up blockers allow it,
    // then point it at the file once it has loaded.
    const tab = window.open('', '_blank');
    try {
      setBusy(true);
      const blob = await fetchProtectedFile(url);
      const objectUrl = URL.createObjectURL(blob);
      if (tab) tab.location.href = objectUrl;
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch {
      if (tab) tab.close();
      alert('Could not open the proof file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <a href={url} onClick={open} className={className}>
      {busy ? 'Opening…' : children}
    </a>
  );
}