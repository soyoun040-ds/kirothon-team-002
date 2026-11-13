import { createClient } from "@supabase/supabase-js";

// Supabase 클라이언트는 여기서만 만든다. 다른 파일에서는 import해서 쓴다.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(".env.local에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY를 넣어 주세요.");
}

export const supabase = createClient(url, anonKey);
