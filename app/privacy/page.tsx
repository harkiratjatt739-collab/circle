import Link from "next/link";
export const metadata = { title: "Privacy notice · Circle" };
export default function Privacy() {
  const items: [string, string][] = [
    ["What we collect", "Your email, display name, marker emoji and color, the Circles you belong to, and, only while you are sharing, your latitude, longitude, accuracy and timestamp. Nothing else. No device identifiers, contacts or analytics."],
    ["When we collect it", "Only after you press “Start sharing” and allow your browser’s location permission. Sharing runs only while Circle is open in your browser. Closing the tab stops it."],
    ["Who can see it", "Only members of a Circle you belong to. Nobody outside your Circles can see anything."],
    ["Trails", "Off by default. If you turn on “Share my own trail”, members of your Circle can see your last 30 minutes of movement. Turn it off and the trail is erased immediately."],
    ["How long we keep it", "We keep only your latest position per Circle. It expires and is deleted 24 hours after it was last updated."],
    ["How to stop", "Press “Stop sharing” at any time. Sharing ends instantly and your marker disappears. You can also revoke location permission in your browser."],
    ["Delete your data", "In Settings, delete your location history, or delete your account and everything linked to it."]];
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-5 py-10"><Link href="/" className="text-sm text-white/60 underline">← Circle</Link>
      <h1 className="font-display text-4xl font-extrabold">Privacy notice</h1>
      {items.map(([h, t]) => <section key={h} className="glass p-5"><h2 className="font-display text-lg font-semibold">{h}</h2><p className="mt-1 text-white/75">{t}</p></section>)}</main>);
}
