import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const contentType = "image/png";

export const size = { width: 32, height: 32 };

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          borderRadius: 6,
        }}
      >
        🚆
      </div>
    ),
    { width: 32, height: 32 },
  );
}
