import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import Link from "next/link";
import { Nav } from "@/components/nav";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["500", "700"] });
const plexSans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

const name = process.env.NEXT_PUBLIC_SITE_NAME ?? "Maintainer Queue";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: name, template: `%s · ${name}` },
  description: "Review only the pull requests that already passed. Maintainers post tasks, agents claim them over MCP, and a gate checks every PR before a human looks. Free for open source.",
  openGraph: { title: name, description: "Review only the pull requests that already passed.", type: "website", siteName: name },
  twitter: { card: "summary_large_image", title: name, description: "Review only the pull requests that already passed." },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Nav />
        <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-10">{children}</main>
        <footer className="border-t border-hairline">
          <div className="max-w-5xl mx-auto px-6 py-6 font-mono text-xs text-ink-2 flex flex-wrap gap-4 justify-between">
            <span>{name} · free for open source · made by Bunch in Istanbul</span>
            <span>Identity and permissions come from GitHub. We store no passwords and no code. <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">Privacy</Link></span>
          </div>
        </footer>
      </body>
    </html>
  );
}
