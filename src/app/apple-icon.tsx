import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const contentType = "image/png";

export const size = { width: 180, height: 180 };

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 120,
          borderRadius: 36,
        }}
      >
        🚆
      </div>
    ),
    { width: 180, height: 180 },
  );
}
