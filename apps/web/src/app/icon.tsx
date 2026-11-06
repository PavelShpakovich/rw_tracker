import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const contentType = "image/png";

export const size = { width: 512, height: 512 };

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 512,
        height: 512,
        background: "#f4b400",
        color: "#1a1913",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 250,
        fontWeight: 700,
        letterSpacing: -12,
      }}
    >
      RW
    </div>,
    { width: 512, height: 512 },
  );
}
