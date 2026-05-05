import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PERM_KEY = 'meetmesh_linkedin_photo_perm';

interface Props {
  linkedInUsername: string;
  onPhotoFetched: (url: string) => void;
  onDismiss: () => void;
}

type PermState = 'asking' | 'loading' | 'done' | 'failed';

export function LinkedInPhotoPermission({ linkedInUsername, onPhotoFetched, onDismiss }: Props) {
  const [permState, setPermState] = useState<PermState>('asking');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(PERM_KEY);
    if (stored === 'denied') { onDismiss(); }
  }, [onDismiss]);

  const handleAllow = () => {
    setPermState('loading');
    localStorage.setItem(PERM_KEY, 'granted');

    const url = `https://unavatar.io/linkedin/${linkedInUsername}`;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      setPreviewUrl(url);
      onPhotoFetched(url);
      setPermState('done');
    };

    img.onerror = () => {
      const fallback = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(linkedInUsername)}`;
      setPreviewUrl(fallback);
      onPhotoFetched(fallback);
      setPermState('failed');
    };

    img.src = url;
  };

  const handleDeny = () => {
    localStorage.setItem(PERM_KEY, 'denied');
    onDismiss();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="li-perm-banner"
        initial={{ opacity: 0, y: -8, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.25 }}
      >
        {permState === 'asking' && (
          <>
            <div className="li-perm-icon">🔗</div>
            <div className="li-perm-copy">
              <span className="li-perm-title">Auto-fetch your LinkedIn photo?</span>
              <span className="li-perm-sub">
                We use <strong>unavatar.io</strong> as a privacy-friendly proxy — your LinkedIn credentials are never shared.
              </span>
            </div>
            <div className="li-perm-actions">
              <button className="li-perm-allow" onClick={handleAllow}>Allow</button>
              <button className="li-perm-skip"  onClick={handleDeny}>Skip</button>
            </div>
          </>
        )}

        {permState === 'loading' && (
          <>
            <div className="li-perm-icon li-spin">⟳</div>
            <div className="li-perm-copy">
              <span className="li-perm-title">Fetching your photo…</span>
            </div>
          </>
        )}

        {permState === 'done' && previewUrl && (
          <>
            <img src={previewUrl} alt="LinkedIn" className="li-perm-preview" />
            <div className="li-perm-copy">
              <span className="li-perm-title">Photo fetched! ✓</span>
              <span className="li-perm-sub">This will appear on your mesh node.</span>
            </div>
            <button className="li-perm-skip" onClick={onDismiss}>Done</button>
          </>
        )}

        {permState === 'failed' && previewUrl && (
          <>
            <img src={previewUrl} alt="Avatar" className="li-perm-preview" />
            <div className="li-perm-copy">
              <span className="li-perm-title">Couldn't fetch LinkedIn photo</span>
              <span className="li-perm-sub">Using a generated avatar instead. You can still upload a photo above.</span>
            </div>
            <button className="li-perm-skip" onClick={onDismiss}>Ok</button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
