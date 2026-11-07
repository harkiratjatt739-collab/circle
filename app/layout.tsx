import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
export const metadata: Metadata = { title: "Circle: share where you are, only with who you choose", description: "Private, opt-in live location for small groups of friends." };
export const viewport: Viewport = { themeColor: "#0D0B1E", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${display.variable} ${body.variable}`}><body className="font-sans antialiased">{children}</body></html>;
}
