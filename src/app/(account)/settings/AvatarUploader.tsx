'use client';

import { useActionState, useEffect, useState } from 'react';
import { Avatar } from '@/components/Avatar/Avatar';
import { Button } from '@/components/Button/Button';
import { uploadAvatarAction } from '@/modules/accounts/actions';
import styles from './settings.module.css';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_DIMENSION = 128;

interface AvatarUploaderProps {
  name: string;
  currentAvatarUrl: string | null;
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Could not read image.'));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AvatarUploader({ name, currentAvatarUrl }: AvatarUploaderProps) {
  const [state, action, isPending] = useActionState(uploadAvatarAction, null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [lastHandledState, setLastHandledState] = useState(state);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  if (state !== lastHandledState) {
    setLastHandledState(state);
    if (state?.ok) {
      setPreviewUrl(null);
      setPendingFile(null);
      setClientError(null);
      setInputKey((k) => k + 1);
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setClientError(null);
    const file = event.target.files?.[0];
    if (!file) {
      setPendingFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setClientError('Avatar must be a JPEG, PNG, or WebP image.');
      setPendingFile(null);
      setPreviewUrl(null);
      event.target.value = '';
      return;
    }

    if (file.size > MAX_BYTES) {
      setClientError('Avatar must be smaller than 5 MB.');
      setPendingFile(null);
      setPreviewUrl(null);
      event.target.value = '';
      return;
    }

    try {
      const { width, height } = await readImageDimensions(file);
      if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
        setClientError(`Avatar must be at least ${MIN_DIMENSION}×${MIN_DIMENSION} pixels.`);
        setPendingFile(null);
        setPreviewUrl(null);
        event.target.value = '';
        return;
      }
    } catch {
      setClientError('Could not read image. Please choose a different file.');
      setPendingFile(null);
      setPreviewUrl(null);
      event.target.value = '';
      return;
    }

    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleCancel() {
    setPendingFile(null);
    setPreviewUrl(null);
    setClientError(null);
    setInputKey((k) => k + 1);
  }

  const displayedSrc = previewUrl ?? currentAvatarUrl ?? undefined;
  const serverError = state?.ok === false ? state.message : undefined;
  const errorMessage = clientError ?? serverError;

  return (
    <form action={action} className={styles.avatarForm}>
      <div className={styles.avatarPreviewRow}>
        <Avatar name={name || 'You'} src={displayedSrc} size="lg" />
        <div className={styles.avatarMeta}>
          <p className={styles.avatarHint}>
            JPEG, PNG, or WebP. At least {MIN_DIMENSION}×{MIN_DIMENSION}px, up to 5 MB.
          </p>
          <div className={styles.avatarControls}>
            <label className={styles.fileButton}>
              <input
                key={inputKey}
                type="file"
                name="avatar"
                accept={ALLOWED_MIME_TYPES.join(',')}
                onChange={handleFileChange}
                className={styles.fileInput}
              />
              <span>{currentAvatarUrl || pendingFile ? 'Choose new photo' : 'Choose photo'}</span>
            </label>
            {pendingFile && (
              <>
                <Button type="submit" variant="primary" size="compact" disabled={isPending}>
                  {isPending ? 'Uploading…' : 'Upload'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="compact"
                  onClick={handleCancel}
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
      {errorMessage && (
        <p className={styles.avatarError} role="alert">
          {errorMessage}
        </p>
      )}
      {state?.ok === true && <p className={styles.successMessage}>Avatar updated.</p>}
    </form>
  );
}
