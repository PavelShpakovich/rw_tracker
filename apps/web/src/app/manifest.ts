import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RW Tracker",
    short_name: "RW Tracker",
    description: "Отслеживание свободных мест на поезда БЖД",
    start_url: "/",
    display: "standalone",
    background_color: "#f2efe6",
    theme_color: "#f4b400",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
