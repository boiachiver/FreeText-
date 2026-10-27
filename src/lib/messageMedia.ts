import { supabase } from "./supabase";

export const MESSAGE_MEDIA_BUCKET = "message-media";
export const MAX_MESSAGE_MEDIA_BYTES = 50 * 1024 * 1024;

const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "attachment";

export async function uploadMessageMedia(args: {
  file: File;
  userId: string;
  conversationId: string;
  messageId: string;
}) {
  const { file, userId, conversationId, messageId } = args;
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    throw new Error("Only pictures and videos can be attached to messages.");
  }
  if (file.size > MAX_MESSAGE_MEDIA_BYTES) {
    throw new Error("That file is larger than the 50 MB message-media limit.");
  }

  const path = `${userId}/${conversationId}/${messageId}-${safeName(file.name)}`;
  const { error } = await supabase.storage.from(MESSAGE_MEDIA_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function createMessageMediaUrl(path: string) {
  const { data, error } = await supabase.storage.from(MESSAGE_MEDIA_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function removeMessageMedia(path: string) {
  const { error } = await supabase.storage.from(MESSAGE_MEDIA_BUCKET).remove([path]);
  if (error) console.warn("Could not remove message media", error);
}
