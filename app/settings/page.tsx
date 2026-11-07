"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase as sb } from "@/lib/supabase/client";
import ProfileForm, { Profile } from "@/components/ProfileForm";
export default function Settings() {
  const r = useRouter(); const [p, setP] = useState<Profile | null>(null); const [msg, setMsg] = useState("");
  useEffect(() => { (async () => { const { data: { user } } = await sb.auth.getUser(); const { data } = await sb.from("users").select("display_name,avatar_emoji,marker_color").eq("id", user!.id).single(); setP(data as Profile); })(); }, []);
  async function wipe() {
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from("location_shares").delete().eq("user_id", user!.id); setMsg(error ? error.message : "Your location history is deleted.");
  }
  async function del() {
    if (!confirm("Delete your account and all your data? This can’t be undone. Circles you own will be deleted too.")) return;
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (!res.ok) return setMsg("Couldn’t delete your account. Try again."); await sb.auth.signOut(); r.push("/");
  }
  return (
    <main className="mx-auto max-w-xl space-y-5 px-5 py-8">
      <Link href="/dashboard" className="text-sm text-white/60 underline">← Back</Link><h1 className="font-display text-3xl font-bold">Settings</h1>
      <section className="glass p-5">{p ? <ProfileForm initial={p} label="Save profile" onSave={async (v) => { const { data: { user } } = await sb.auth.getUser(); const { error } = await sb.from("users").update(v).eq("id", user!.id); setMsg(error ? error.message : "Saved."); }} /> : <div className="skeleton h-48" />}</section>
      <section className="glass space-y-3 p-5"><h2 className="font-display text-xl font-semibold">Your data</h2>
        <button onClick={wipe} className="btn-ghost w-full">Delete my location history</button><button onClick={del} className="btn-danger w-full">Delete my account and all data</button>
        <Link href="/privacy" className="block text-center text-sm text-white/60 underline">Read the privacy notice</Link></section>
      {msg && <p role="status" className="text-center text-sm text-live">{msg}</p>}
    </main>);
}
