import { createClient } from "./supabase";
import { decrypt } from "./crypto";

export class NoApiKeyError extends Error {
  constructor() {
    super("No Gemini API key found. Add one in your profile settings to use AI features.");
    this.name = "NoApiKeyError";
  }
}

export async function getUserGeminiKey(uid: string): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase
    .from("user_settings")
    .select("encrypted_gemini_key")
    .eq("user_id", uid)
    .maybeSingle();

  if (!data?.encrypted_gemini_key) {
    throw new NoApiKeyError();
  }

  return decrypt(data.encrypted_gemini_key);
}