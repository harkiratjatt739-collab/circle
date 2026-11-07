import Link from "next/link";
const dots = [["22%","38%","#8B7CFF","🦊"],["58%","24%","#FFB27A","🌿"],["70%","62%","#7CF5C8","🎧"],["36%","70%","#FF7AA8","🚲"]];
export default function Landing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 py-6">
      <nav className="flex items-center justify-between"><span className="font-display text-2xl font-bold">Circle</span>
        <div className="flex gap-2"><Link href="/privacy" className="btn-ghost">Privacy</Link><Link href="/login" className="btn-primary">Sign in</Link></div></nav>
      <section className="grid flex-1 items-center gap-10 py-12 md:grid-cols-2">
        <div>
          <h1 className="font-display text-5xl font-extrabold leading-[1.02] tracking-tight md:text-7xl">Share where you are with the few who matter.</h1>
          <p className="mt-5 max-w-md text-lg text-white/70">A private map for your friends. You press start, they see you. You press stop, you disappear. Nothing runs in the background.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href="/login" className="btn-primary">Create your Circle</Link><Link href="/privacy" className="btn-ghost">What we collect</Link></div>
          <p className="mt-6 text-sm text-white/50">Invite-only. Opt-in. Locations expire after 24 hours.</p>
        </div>
        <div aria-hidden className="glass relative aspect-square overflow-hidden" style={{ backgroundImage: "linear-gradient(#ffffff0d 1px,transparent 1px),linear-gradient(90deg,#ffffff0d 1px,transparent 1px)", backgroundSize: "44px 44px" }}>
          {dots.map(([x, y, c, e], i) => (
            <span key={i} className="pulse absolute grid h-11 w-11 place-items-center rounded-full border-2 border-white text-xl" style={{ left: x, top: y, background: c, animationDelay: `${i * 0.5}s` }}>{e}</span>))}
        </div>
      </section>
    </main>);
}
