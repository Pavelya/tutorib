import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const AVATAR_BUCKET = 'user-avatars';

export const AVATAR_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const MIME_EXTENSIONS: Record<(typeof AVATAR_ALLOWED_MIME_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function extensionFor(mime: string): string {
  return MIME_EXTENSIONS[mime as (typeof AVATAR_ALLOWED_MIME_TYPES)[number]] ?? 'bin';
}

/**
 * Upload an avatar file for the given app_user to the public avatars bucket
 * and return its public URL. The path convention is:
 *   app-user/{appUserId}/avatar-{timestamp}.{ext}
 */
export async function uploadAvatar(appUserId: string, file: File): Promise<string> {
  const supabase = createSupabaseAdmin();
  const ext = extensionFor(file.type);
  const path = `app-user/${appUserId}/avatar-${Date.now()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
