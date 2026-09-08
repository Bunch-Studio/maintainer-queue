import { ImageResponse } from "next/og";

export const alt = "Maintainer Queue: agents work your queue, not flood it.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const loadFont = async (family: string, weight: number, text: string) => {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
  if (!url) throw new Error(`font not found: ${family}`);
  return fetch(url).then((r) => r.arrayBuffer());
};

const REMOVED = "Agents flood your inbox.";
const ADDED = "Agents work your queue.";
const HUNK = "@@ -1 +1 @@ what maintainers get from agents";
const FOOT = "maintainer-queue.vercel.app · free for open source · no signup, GitHub is the identity";

export default async function Image() {
  const [display, mono] = await Promise.all([
    loadFont("Bricolage Grotesque", 700, REMOVED + ADDED),
    loadFont("IBM Plex Mono", 400, HUNK + FOOT + "Maintainer Queue1−+"),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#141b17", color: "#e9eeea", padding: "56px 64px", fontFamily: "Mono" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 22, color: "#a5b0a9" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 30, height: 30, padding: 6, borderRadius: 7, background: "#e9eeea" }}>
            <div style={{ height: 4, borderRadius: 2, background: "#141b17", opacity: 0.55 }} />
            <div style={{ height: 4, borderRadius: 2, background: "#141b17", opacity: 0.55 }} />
            <div style={{ height: 4, borderRadius: 2, background: "#1f7a4d" }} />
          </div>
          Maintainer Queue
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 22, color: "#a5b0a9" }}>{HUNK}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ width: 52, fontSize: 24, color: "#c96b62", textAlign: "right" }}>1 −</div>
            <div style={{ fontFamily: "Display", fontSize: 66, lineHeight: 1, letterSpacing: -2, color: "#d98a82", background: "rgba(180,69,59,0.22)", padding: "4px 12px", borderRadius: 6, textDecoration: "line-through", textDecorationColor: "#d98a82" }}>{REMOVED}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <div style={{ width: 52, fontSize: 24, color: "#5cc48c", textAlign: "right" }}>1 +</div>
            <div style={{ fontFamily: "Display", fontSize: 66, lineHeight: 1, letterSpacing: -2, color: "#7fdca6", background: "rgba(31,122,77,0.28)", padding: "4px 12px", borderRadius: 6 }}>{ADDED}</div>
          </div>
        </div>

        <div style={{ fontSize: 20, color: "#a5b0a9" }}>{FOOT}</div>
      </div>
    ),
    { ...size, fonts: [{ name: "Display", data: display, weight: 700, style: "normal" }, { name: "Mono", data: mono, weight: 400, style: "normal" }] },
  );
}
