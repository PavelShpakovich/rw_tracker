import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@rw/core", "@rw/db"],
  serverExternalPackages: ["postgres", "@electric-sql/pglite"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
