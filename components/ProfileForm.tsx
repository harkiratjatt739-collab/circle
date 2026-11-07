"use client";
import { useState } from "react";
const EMOJI = ["🙂","🦊","🌿","🎧","🚲","🐙","🔥","🌙","🍋","🛹","🐢","⭐"];
const COLORS = ["#8B7CFF","#FFB27A","#7CF5C8","#FF7AA8","#5CC8FF","#F5E663"];
export type Profile = { display_name: string; avatar_emoji: string; marker_color: string };
export default function ProfileForm({ initial, label, onSave }: { initial: Profile; label: string; onSave: (p: Profile) => Promise<string | void> }) {
  const [p, setP] = useState(initial); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState("");
  return (
    <form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setMsg((await onSave(p)) || ""); setBusy(false); }}>
      <div><label htmlFor="dn" className="mb-1 block text-sm text-white/70">Display name</label>
        <input id="dn" className="input" required maxLength={24} value={p.display_name} onChange={(e) => setP({ ...p, display_name: e.target.value })} /></div>
      <fieldset><legend className="mb-1 text-sm text-white/70">Marker emoji</legend>
        <div className="flex flex-wrap gap-2">{EMOJI.map((e) => <button type="button" key={e} aria-pressed={p.avatar_emoji === e} onClick={() => setP({ ...p, avatar_emoji: e })}
          className={`h-11 w-11 rounded-xl text-xl transition ${p.avatar_emoji === e ? "bg-white/30 ring-2 ring-peach" : "bg-white/10"}`}>{e}</button>)}</div></fieldset>
      <fieldset><legend className="mb-1 text-sm text-white/70">Marker color</legend>
        <div className="flex gap-2">{COLORS.map((c) => <button type="button" key={c} aria-label={`Color ${c}`} aria-pressed={p.marker_color === c} onClick={() => setP({ ...p, marker_color: c })}
          className={`h-9 w-9 rounded-full border-2 transition ${p.marker_color === c ? "scale-110 border-white" : "border-transparent"}`} style={{ background: c }} />)}</div></fieldset>
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Saving…" : label}</button>
      {msg && <p role="alert" className="text-sm text-red-300">{msg}</p>}
    </form>);
}
