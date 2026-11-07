"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase as sb } from "@/lib/supabase/client";
import ProfileForm, { Profile } from "@/components/ProfileForm";
export default function Join() {
  const { code } = useParams<{ code: string }>(); const r = useRouter(); const [init, setInit] = useState<Profile | null>(null);
  useEffect(() => { (async () => { const { data: { user } } = await sb.auth.getUser();
    const { data } = await sb.from("users").select("display_name,avatar_emoji,marker_color").eq("id", user!.id).single(); setInit(data as Profile); })(); }, []);
  return (
    <main className="grid min-h-dvh place-items-center px-5"><div className="glass w-full max-w-sm p-6">
      <h1 className="font-display text-3xl font-bold">Join with code {code}</h1>
      <p className="mb-5 mt-1 text-sm text-white/60">Members of this Circle will see your name and marker, and your location only while you choose to share.</p>
      {!init ? <div className="skeleton h-48" /> : <ProfileForm initial={init} label="Join Circle" onSave={async (p) => {
        const { data: { user } } = await sb.auth.getUser();
        const u = await sb.from("users").update(p).eq("id", user!.id); if (u.error) return u.error.message;
        const { data, error } = await sb.rpc("join_circle", { p_code: code }); if (error) return error.message; r.push(`/circle/${data}`); }} />}
    </div></main>);
}
