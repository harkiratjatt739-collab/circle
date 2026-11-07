"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import "leaflet/dist/leaflet.css";
import type * as LT from "leaflet";
import { AnimatePresence, motion } from "framer-motion";
import { supabase as sb } from "@/lib/supabase/client";

type Member = { user_id: string; share_trail: boolean; users: { display_name: string; avatar_emoji: string; marker_color: string } };
type Share = { user_id: string; latitude: number; longitude: number; accuracy: number | null; recorded_at: string; is_active: boolean; trail: [number, number, number][] | null };
const LIVE_MS = 5 * 60_000; // an "active" row older than this is shown as last seen (tab closed, phone asleep)
const ago = (iso: string) => { const s = Math.round((Date.now() - +new Date(iso)) / 1000); return s < 60 ? "just now" : s < 3600 ? `${Math.floor(s / 60)}m ago` : `${Math.floor(s / 3600)}h ago`; };
const isLive = (s?: Share) => !!s && s.is_active && Date.now() - +new Date(s.recorded_at) < LIVE_MS;
function glide(mk: LT.Marker, to: [number, number]) { // smooth marker movement
  const a = mk.getLatLng(), t0 = performance.now();
  const step = (t: number) => { const k = Math.min(1, (t - t0) / 800); mk.setLatLng([a.lat + (to[0] - a.lat) * k, a.lng + (to[1] - a.lng) * k]); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

export default function CircleView({ id }: { id: string }) {
  const [circle, setCircle] = useState<{ name: string; invite_code: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]); const [shares, setShares] = useState<Record<string, Share>>({});
  const [me, setMe] = useState(""); const [sharing, setSharing] = useState(false); const [err, setErr] = useState("");
  const [sheet, setSheet] = useState(true); const [showTrails, setShowTrails] = useState(false); const [ready, setReady] = useState(false); const [copied, setCopied] = useState(false);
  const [, tick] = useState(0);
  const mapEl = useRef<HTMLDivElement>(null); const map = useRef<LT.Map>(); const L = useRef<typeof LT>();
  const markers = useRef<Record<string, LT.Marker>>({}); const lines = useRef<Record<string, LT.Polyline>>({});
  const watch = useRef<number>(); const last = useRef(0); const trail = useRef<[number, number, number][]>([]); const fitted = useRef(false);
  const data = useRef({ shares, members }); data.current = { shares, members };
  const mine = members.find((m) => m.user_id === me); const trailOn = useRef(false); trailOn.current = !!mine?.share_trail;

  // Load circle, members, current locations; subscribe to realtime
  useEffect(() => {
    let ch: ReturnType<typeof sb.channel> | undefined, dead = false;
    (async () => {
      const { data: { user } } = await sb.auth.getUser(); if (!user) return; setMe(user.id);
      const { data: c } = await sb.from("circles").select("name,invite_code").eq("id", id).single();
      if (!c) return setErr("Circle not found, or you’re not a member.");
      setCircle(c);
      const [m, s] = await Promise.all([
        sb.from("circle_members").select("user_id,share_trail,users(display_name,avatar_emoji,marker_color)").eq("circle_id", id),
        sb.from("location_shares").select("*").eq("circle_id", id).gt("expires_at", new Date().toISOString())]);
      setMembers((m.data as any) || []); setShares(Object.fromEntries(((s.data as Share[]) || []).map((r) => [r.user_id, r])));
      if (dead) return; // effect was cleaned up (React dev double-run) before data arrived
      ch = sb.channel(`loc-${id}-${Math.random().toString(36).slice(2)}`).on("postgres_changes", { event: "*", schema: "public", table: "location_shares", filter: `circle_id=eq.${id}` }, (p: any) =>
        setShares((cur) => { const n = { ...cur }; p.eventType === "DELETE" ? delete n[p.old.user_id] : (n[p.new.user_id] = p.new); return n; }))
        .on("postgres_changes", { event: "*", schema: "public", table: "circle_members", filter: `circle_id=eq.${id}` }, async () => {
          const { data: m2 } = await sb.from("circle_members").select("user_id,share_trail,users(display_name,avatar_emoji,marker_color)").eq("circle_id", id); setMembers((m2 as any) || []); })
        .subscribe();
    })();
    const t = setInterval(() => tick((x) => x + 1), 15_000);
    return () => { dead = true; clearInterval(t); ch && sb.removeChannel(ch); };
  }, [id]);

  // Map init: standard OpenStreetMap tiles (no API key), darkened with CSS. For heavy traffic use a tile provider with a free key.
  useEffect(() => {
    let m: LT.Map | undefined, dead = false;
    import("leaflet").then((mod) => {
      if (dead || !mapEl.current) return; const l = (mod.default ?? mod) as typeof LT; L.current = l;
      m = l.map(mapEl.current, { center: [20, 0], zoom: 2, zoomControl: false });
      l.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, className: "osm-dark",
        attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors" }).addTo(m);
      map.current = m; setReady(true);
    }).catch(() => setErr("The map failed to load. Check your internet connection."));
    return () => { dead = true; m?.remove(); map.current = undefined; markers.current = {}; lines.current = {}; };
  }, []);

  const fitAll = useCallback(() => {
    const live = Object.values(data.current.shares).filter(isLive); if (!map.current || !L.current || !live.length) return;
    map.current.fitBounds(L.current.latLngBounds(live.map((s) => [s.latitude, s.longitude] as [number, number])), { padding: [90, 90], maxZoom: 16 });
  }, []);

  function openInfo(uid: string) {
    const s = data.current.shares[uid], u = data.current.members.find((m) => m.user_id === uid)?.users, mk = markers.current[uid]; if (!s || !u || !mk) return;
    const el = document.createElement("div"); el.style.cssText = "font:14px sans-serif;white-space:pre-line";
    el.textContent = `${u.avatar_emoji} ${u.display_name}
Updated ${ago(s.recorded_at)}
Accuracy ±${Math.round(s.accuracy ?? 0)} m`; // textContent = XSS-safe
    mk.bindPopup(el).openPopup();
  }

  // Render markers + opt-in trails
  useEffect(() => {
    const m = map.current, l = L.current; if (!m || !l) return;
    const active = Object.values(shares).filter((s) => isLive(s) && members.some((x) => x.user_id === s.user_id));
    Object.keys(markers.current).forEach((k) => { if (!active.find((s) => s.user_id === k)) { markers.current[k].remove(); delete markers.current[k]; } });
    Object.keys(lines.current).forEach((k) => { const s = shares[k]; if (!showTrails || !isLive(s) || !s.trail || s.trail.length < 2) { lines.current[k].remove(); delete lines.current[k]; } });
    active.forEach((s) => {
      const u = members.find((x) => x.user_id === s.user_id)!.users, pos: [number, number] = [s.latitude, s.longitude];
      let mk = markers.current[s.user_id];
      if (!mk) {
        const pin = document.createElement("div"); pin.textContent = u.avatar_emoji;
        pin.style.cssText = `width:36px;height:36px;border-radius:9999px;border:3px solid #fff;background:${/^#[0-9a-fA-F]{6}$/.test(u.marker_color) ? u.marker_color : "#8B7CFF"};display:grid;place-items:center;font-size:18px;box-shadow:0 4px 14px #0008`;
        mk = l.marker(pos, { title: u.display_name, icon: l.divIcon({ html: pin, className: "", iconSize: [36, 36], iconAnchor: [18, 18] }) }).addTo(m);
        mk.on("click", () => openInfo(s.user_id)); markers.current[s.user_id] = mk;
      } else glide(mk, pos);
      if (showTrails && s.trail && s.trail.length > 1) { // trail only exists if that member opted in
        const path = s.trail.map(([a, b]) => [a, b] as [number, number]);
        const pl = lines.current[s.user_id]; pl ? pl.setLatLngs(path) : (lines.current[s.user_id] = l.polyline(path, { color: u.marker_color, weight: 4, opacity: 0.7 }).addTo(m));
      }
    });
    if (!fitted.current && active.length) { fitted.current = true; fitAll(); }
  }, [shares, members, showTrails, ready, fitAll]);

  // ---- Sharing: only starts from an explicit button press ----
  async function push(pos: GeolocationPosition) {
    const now = Date.now(); if (now - last.current < 5000) return; last.current = now;
    const { latitude, longitude, accuracy } = pos.coords;
    const t = trailOn.current ? (trail.current = [...trail.current, [latitude, longitude, now] as [number, number, number]].filter((p) => p[2] > now - 30 * 60_000)) : null;
    const { error } = await sb.from("location_shares").upsert({ user_id: me, circle_id: id, latitude, longitude, accuracy, recorded_at: new Date(now).toISOString(),
      expires_at: new Date(now + 24 * 3600_000).toISOString(), is_active: true, trail: t }, { onConflict: "user_id,circle_id" });
    if (error) setErr("Couldn’t save your location: " + error.message);
  }
  async function stop() {
    if (watch.current != null) navigator.geolocation.clearWatch(watch.current); watch.current = undefined; trail.current = []; setSharing(false);
    await sb.from("location_shares").update({ is_active: false, trail: null }).eq("user_id", me).eq("circle_id", id);
  }
  function start() {
    if (!("geolocation" in navigator)) return setErr("This browser doesn’t support location sharing.");
    setErr(""); last.current = 0; setSharing(true);
    watch.current = navigator.geolocation.watchPosition(push, (e) => {
      if (e.code === 1) { setErr("Location permission was denied. Allow it in your browser’s site settings, then try again."); stop(); }
      else setErr(e.code === 2 ? "Your device couldn’t find a position. Check that GPS or Wi-Fi location is on." : "Locating timed out. Still trying…");
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  }
  useEffect(() => () => { if (watch.current != null) { navigator.geolocation.clearWatch(watch.current); sb.from("location_shares").update({ is_active: false, trail: null }).eq("circle_id", id).then(() => {}); } }, [id]);

  async function toggleTrail() {
    const v = !trailOn.current; trail.current = [];
    await sb.from("circle_members").update({ share_trail: v }).eq("circle_id", id).eq("user_id", me);
    setMembers((ms) => ms.map((x) => (x.user_id === me ? { ...x, share_trail: v } : x)));
    if (!v) await sb.from("location_shares").update({ trail: null }).eq("user_id", me).eq("circle_id", id);
  }
  function focusMe() {
    const s = shares[me]; if (!sharing || !s) return setErr("Start sharing to focus on yourself. Circle never reads your location otherwise.");
    map.current?.setView([s.latitude, s.longitude], 17, { animate: true });
  }
  async function copyInvite() { await navigator.clipboard.writeText(`${location.origin}/join/${circle!.invite_code}`); setCopied(true); setTimeout(() => setCopied(false), 1800); }

  const liveCount = Object.values(shares).filter(isLive).length;
  return (
    <div className="fixed inset-0">
      <div ref={mapEl} className="h-full w-full" aria-label="Map of friends who are sharing" style={{ background: "#0a0918" }} />
      <header className="glass absolute inset-x-3 top-3 flex items-center gap-3 rounded-2xl px-3 py-2">
        <Link href="/dashboard" aria-label="Back to Circles" className="btn-ghost !px-3 !py-2">←</Link>
        <div className="min-w-0 flex-1">{circle ? <><p className="truncate font-display font-bold">{circle.name}</p><p className="text-xs text-white/60">{members.length} members · {liveCount} sharing</p></> : <div className="skeleton h-9 w-40" />}</div>
        <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${sharing ? "bg-live/20 text-live" : "bg-white/10 text-white/60"}`}>
          <span className={`h-2 w-2 rounded-full ${sharing ? "bg-live" : "bg-white/40"}`} />{sharing ? "You’re sharing" : "Not sharing"}</span>
        <button onClick={() => setSheet((s) => !s)} className="btn-ghost !px-3 !py-2" aria-expanded={sheet} aria-label="Toggle member list">☰</button>
      </header>

      {err && <div role="alert" className="glass absolute inset-x-3 top-20 flex items-start justify-between gap-3 !rounded-2xl border-red-400/40 p-3 text-sm text-red-200"><span>{err}</span><button aria-label="Dismiss" onClick={() => setErr("")}>✕</button></div>}

      <AnimatePresence>{sheet && (
        <motion.aside initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: "spring", damping: 24, stiffness: 260 }}
          className="glass absolute inset-x-3 bottom-3 max-h-[52dvh] overflow-y-auto p-4 md:inset-x-auto md:bottom-4 md:left-4 md:top-20 md:max-h-none md:w-80">
          <div className="mb-3 grid grid-cols-2 gap-2">
            {sharing ? <button className="btn-danger col-span-2" onClick={stop}>Stop sharing</button> : <button className="btn-primary col-span-2" onClick={start}>Start sharing</button>}
            <button className="btn-ghost" onClick={focusMe}>Focus on me</button><button className="btn-ghost" onClick={fitAll}>Fit all friends</button>
          </div>
          <label className="mb-1 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">Show friends’ trails (30 min)<input type="checkbox" className="h-5 w-5 accent-violet" checked={showTrails} onChange={(e) => setShowTrails(e.target.checked)} /></label>
          <label className="mb-3 flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-sm">Share my own trail<input type="checkbox" className="h-5 w-5 accent-violet" checked={!!mine?.share_trail} onChange={toggleTrail} /></label>
          <ul className="space-y-2">
            {members.length === 0 && [0, 1, 2].map((i) => <li key={i} className="skeleton h-14" />)}
            {members.map((m) => { const s = shares[m.user_id], live = isLive(s); return (
              <li key={m.user_id}><button disabled={!live} onClick={() => { map.current?.setView([s!.latitude, s!.longitude], 16, { animate: true }); openInfo(m.user_id); }}
                className="flex w-full items-center gap-3 rounded-2xl bg-white/5 p-3 text-left transition hover:bg-white/10 disabled:opacity-60">
                <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-white/80 text-lg" style={{ background: m.users.marker_color }}>{m.users.avatar_emoji}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{m.users.display_name}{m.user_id === me && " (you)"}</span>
                  <span className="text-xs text-white/60">{live ? `Sharing · ${ago(s!.recorded_at)} · ±${Math.round(s!.accuracy ?? 0)} m` : s ? `Last seen ${ago(s.recorded_at)}` : "Not sharing"}</span></span>
                {live && <span className="h-2.5 w-2.5 rounded-full bg-live" />}</button></li>); })}
          </ul>
          {liveCount === 0 && members.length > 0 && <p className="mt-3 text-center text-sm text-white/50">No one is sharing right now.</p>}
          {circle && <button onClick={copyInvite} className="btn-ghost mt-3 w-full">{copied ? "Link copied ✓" : `Copy invite link · ${circle.invite_code}`}</button>}
        </motion.aside>)}</AnimatePresence>
    </div>);
}
