import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
export function supabaseServer() {
  const c = cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => c.getAll(), setAll: (l: { name: string; value: string; options: CookieOptions }[]) => { try { l.forEach(({ name, value, options }) => c.set(name, value, options)); } catch {} } } });
}
