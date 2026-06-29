import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
}

export async function getSignedAvatarUrl(
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, 3600); // expires in 1 hour
  if (error) return null;
  return data.signedUrl;
}

export async function deleteAvatar(path: string | null) {
  if (!path) return;
  await supabase.storage.from("avatars").remove([path]);
}

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
