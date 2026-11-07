import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export async function GET(req: Request) {
  const url = new URL(req.url); const code = url.searchParams.get("code");
  let next = url.searchParams.get("next") || "/dashboard"; if (!next.startsWith("/") || next.startsWith("//")) next = "/dashboard"; // block open redirects
  if (code) { const { error } = await supabaseServer().auth.exchangeCodeForSession(code); if (error) return NextResponse.redirect(`${url.origin}/login?error=auth`); }
  return NextResponse.redirect(`${url.origin}${next}`);
}
