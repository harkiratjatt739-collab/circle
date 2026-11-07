"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
function Form() {
  const next = useSearchParams().get("next") || "/dashboard";
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const redirectTo = () => `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  async function magic(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    setBusy(false); error ? setErr(error.message) : setSent(true);
  }
  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
    if (error) setErr(error.message);
  }
  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="glass w-full max-w-sm space-y-4 p-6">
        <h1 className="font-display text-3xl font-bold">Welcome to Circle</h1>
        {sent ? <p role="status" className="text-white/80">Check <b>{email}</b> for your sign-in link.</p> : (
          <form onSubmit={magic} className="space-y-3">
            <label className="sr-only" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button className="btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Email me a sign-in link"}</button>
          </form>)}
        <button onClick={google} className="btn-ghost w-full">Continue with Google</button>
        {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
        <p className="text-xs text-white/50">By continuing you agree to the <a className="underline" href="/privacy">privacy notice</a>.</p>
      </div>
    </main>);
}
export default function Login() { return <Suspense><Form /></Suspense>; }
