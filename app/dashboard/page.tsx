"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase as sb } from "@/lib/supabase/client";
type Row = { circles: { id: string; name: string; invite_code: string } };
export default function Dashboard() {
  const r = useRouter(); const [rows, setRows] = useState<Row[] | null>(null); const [name, setName] = useState(""); const [code, setCode] = useState(""); const [err, setErr] = useState("");
  useEffect(() => { sb.from("circle_members").select("circles(id,name,invite_code)").then(({ data }) => setRows((data as any) || [])); }, []);
  async function create(e: React.FormEvent) {
    e.preventDefault(); const { data, error } = await sb.rpc("create_circle", { p_name: name.trim() });
    error ? setErr(error.message) : r.push(`/circle/${data}`);
  }
  return (
    <main className="mx-auto max-w-xl space-y-5 px-5 py-8">
      <header className="flex items-center justify-between"><h1 className="font-display text-3xl font-bold">Your Circles</h1>
        <div className="flex gap-2"><Link href="/settings" className="btn-ghost">Settings</Link>
          <button className="btn-ghost" onClick={async () => { await sb.auth.signOut(); r.push("/"); }}>Sign out</button></div></header>
      {rows === null ? <div className="space-y-3"><div className="skeleton h-20" /><div className="skeleton h-20" /></div>
        : rows.length === 0 ? <div className="glass p-6 text-white/70">No Circles yet. Create one below, or enter a friend’s invite code.</div>
        : rows.map(({ circles: c }) => <Link key={c.id} href={`/circle/${c.id}`} className="glass flex items-center justify-between p-5 transition hover:bg-white/10">
            <span className="font-display text-xl font-semibold">{c.name}</span><span className="text-sm text-white/50">Code {c.invite_code}</span></Link>)}
      <form onSubmit={create} className="glass flex gap-2 p-4"><input className="input" required maxLength={40} placeholder="New Circle name" aria-label="New Circle name" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn-primary">Create</button></form>
      <form onSubmit={(e) => { e.preventDefault(); r.push(`/join/${code.trim().toUpperCase()}`); }} className="glass flex gap-2 p-4">
        <input className="input uppercase tracking-widest" required minLength={6} maxLength={6} placeholder="6-character invite code" aria-label="Invite code" value={code} onChange={(e) => setCode(e.target.value)} /><button className="btn-ghost">Join</button></form>
      {err && <p role="alert" className="text-sm text-red-300">{err}</p>}
    </main>);
}
