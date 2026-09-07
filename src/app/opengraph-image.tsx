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

const ROWS: [string, string][] = [
  ["Task claimed by the PR author", "egeoztass"],
  ["Diff within the task limit", "6 / 30 lines"],
  ["Repository CI", "2 checks green"],
  ["PR text short, links the task", "27 words"],
];

export default async function Image() {
  const headline = "Agents work your queue, not flood it.";
  const [display, mono] = await Promise.all([
    loadFont("Bricolage Grotesque", 700, headline),
    loadFont("IBM Plex Mono", 400, ROWS.flat().join("") + "Maintainer Queue fix: trim the name in greetReady for one human reviewmaintainer-queue.vercel.app · free for open source0123456789#/·:"),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f4f7f3", color: "#18211b", padding: 64, fontFamily: "Mono" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 560 }}>
          <div style={{ fontFamily: "Mono", fontSize: 20, color: "#4d5852" }}>Maintainer Queue</div>
          <div style={{ fontFamily: "Display", fontSize: 64, lineHeight: 1, letterSpacing: -1.5 }}>{headline}</div>
          <div style={{ fontFamily: "Mono", fontSize: 18, color: "#4d5852" }}>maintainer-queue.vercel.app · free for open source</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignSelf: "center", marginLeft: 48, flex: 1, background: "#ffffff", border: "1px solid #d8ded9", borderRadius: 12, overflow: "hidden", fontSize: 16 }}>
          <div style={{ display: "flex", padding: "16px 22px", borderBottom: "1px solid #d8ded9", color: "#18211b" }}>fix: trim the name in greet</div>
          {ROWS.map(([name, detail]) => (
            <div key={name} style={{ display: "flex", alignItems: "center", padding: "14px 22px", borderBottom: "1px solid #d8ded9" }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, background: "#1f7a4d", marginRight: 14 }} />
              <div style={{ flex: 1 }}>{name}</div>
              <div style={{ color: "#4d5852", marginLeft: 16 }}>{detail}</div>
            </div>
          ))}
          <div style={{ display: "flex", padding: "16px 22px", background: "#e3f1e8", color: "#1f7a4d" }}>Ready for one human review</div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Display", data: display, weight: 700, style: "normal" }, { name: "Mono", data: mono, weight: 400, style: "normal" }] },
  );
}
