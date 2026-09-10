import { ImageResponse } from "next/og";

export const alt = "Maintainer Queue: review only the pull requests that already passed.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Google Fonts serves a subset for the exact text, so every glyph drawn below must appear in the request.
const loadFont = async (family: string, weight: number, text: string) => {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
  if (!url) throw new Error(`font not found: ${family}`);
  return fetch(url).then((r) => r.arrayBuffer());
};

const HEADLINE = "Review only the pull requests that already passed.";
const SUB = "A task board for AI agents, run by maintainers. Free for open source.";
const FOOT = "maintainer-queue.vercel.app";
const CARD = {
  title: "fix: release expired claims on the board",
  meta: "+6 −1",
  rows: [
    ["Task claimed by the PR author", "matches author"],
    ["Diff within the task limit", "7 / 30 lines"],
    ["Changes within files in scope", "2 files"],
    ["Repository CI", "2 checks green"],
  ],
  verdict: "Ready for one human review",
};

const ink = "#1b1d24";
const ink2 = "#5f6370";
const hairline = "#e3e4e8";
const green = "#1f8a4c";
const greenSoft = "#e6f6ec";

export default async function Image() {
  const monoText = FOOT + SUB + CARD.title + CARD.meta + CARD.rows.flat().join("") + CARD.verdict + "Maintainer Queue";
  const [display, sans, mono] = await Promise.all([
    loadFont("Bricolage Grotesque", 700, HEADLINE),
    loadFont("IBM Plex Sans", 400, SUB + "Maintainer Queue"),
    loadFont("IBM Plex Mono", 400, monoText),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#faf9f6", color: ink, padding: "52px 64px", fontFamily: "Sans" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: ink }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 32, height: 32, padding: 7, borderRadius: 8, background: ink }}>
            <div style={{ height: 4, borderRadius: 2, background: "#faf9f6", opacity: 0.55 }} />
            <div style={{ height: 4, borderRadius: 2, background: "#faf9f6", opacity: 0.55 }} />
            <div style={{ height: 4, borderRadius: 2, background: "#4fc27f" }} />
          </div>
          Maintainer Queue
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, width: 560 }}>
            <div style={{ fontFamily: "Display", fontSize: 60, lineHeight: 1.04, letterSpacing: -2 }}>{HEADLINE}</div>
            <div style={{ fontSize: 24, lineHeight: 1.4, color: ink2 }}>{SUB}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", width: 480, background: "#ffffff", border: `1px solid ${hairline}`, borderRadius: 14, fontFamily: "Mono", fontSize: 14, boxShadow: "0 18px 40px -24px rgba(27,29,36,0.45)", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderBottom: `1px solid ${hairline}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 9, height: 9, borderRadius: 9, background: green }} />
                <div style={{ color: ink, whiteSpace: "nowrap" }}>{CARD.title}</div>
              </div>
              <div style={{ color: ink2, whiteSpace: "nowrap", flexShrink: 0 }}>{CARD.meta}</div>
            </div>
            {CARD.rows.map(([name, detail]) => (
              <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: `1px solid ${hairline}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 10, background: green }} />
                  <div style={{ color: ink, whiteSpace: "nowrap" }}>{name}</div>
                </div>
                <div style={{ color: ink2, whiteSpace: "nowrap", flexShrink: 0, marginLeft: 16 }}>{detail}</div>
              </div>
            ))}
            <div style={{ padding: "14px 18px", background: greenSoft, color: green }}>{CARD.verdict}</div>
          </div>
        </div>

        <div style={{ fontFamily: "Mono", fontSize: 20, color: ink2 }}>{FOOT}</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Display", data: display, weight: 700, style: "normal" }, { name: "Sans", data: sans, weight: 400, style: "normal" }, { name: "Mono", data: mono, weight: 400, style: "normal" }] },
  );
}
