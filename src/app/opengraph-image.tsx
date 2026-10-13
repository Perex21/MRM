import { ImageResponse } from "next/og";
import { site } from "@/content/site";

export const alt = `${site.identity} — portfolio of ${site.person.name}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Palette repeated here because this image is rendered outside the CSS pipeline.
const ink = "#101110";
const parchment = "#e8e0d0";
const cinnabar = "#9f292d";
const silver = "#a9aaa3";

/** Social preview: the identity, the role, and the disc. System fonts only. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: ink,
          color: parchment,
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 96,
            right: 120,
            width: 260,
            height: 260,
            borderRadius: 260,
            background: cinnabar,
          }}
        />
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, color: silver, fontFamily: "monospace" }}>
          PORTFOLIO OF {site.person.name.toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 40, letterSpacing: 14, color: silver }}>THE</div>
          <div style={{ display: "flex", fontSize: 132, lineHeight: 1 }}>UNORTHODOX</div>
          <div style={{ display: "flex", fontSize: 132, lineHeight: 1, marginLeft: 150 }}>PATH</div>
        </div>
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 3, color: silver, fontFamily: "monospace" }}>
          {site.role.toUpperCase()}
        </div>
      </div>
    ),
    size,
  );
}
