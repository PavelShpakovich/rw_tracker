import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const contentType = "image/png";

export const size = { width: 180, height: 180 };

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        background: "#f4b400",
        color: "#1a1913",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 88,
        fontWeight: 700,
        letterSpacing: -4,
      }}
    >
      RW
    </div>,
    { width: 180, height: 180 },
  );
}
