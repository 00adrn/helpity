import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The link preview (Discord, iMessage, Slack...): the HelpityLogo wordmark, 4x the "lg" size, on --bg.
export const alt = "Helpity";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const quicksandBold = await readFile(join(process.cwd(), "app/fonts/Quicksand-Bold.ttf"));
const smiley = await readFile(join(process.cwd(), "public/helpity/helpity_happy_rendered.png"));
const smileySrc = `data:image/png;base64,${smiley.toString("base64")}`;

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f1e9",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <div
            style={{
              width: 140,
              height: 140,
              marginRight: -8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={smileySrc}
              alt=""
              width={120}
              height={120}
              style={{ transform: "translate(-4px, -14px) rotate(-22.28deg)" }}
            />
          </div>
          <div
            style={{
              fontFamily: "Quicksand",
              fontSize: 192,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: -4.8,
              color: "#3e332b",
            }}
          >
            Helpity
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Quicksand", data: quicksandBold, style: "normal", weight: 700 }],
    },
  );
}
