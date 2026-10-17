import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    resolveAlias: {
      // y-monaco 0.1.6 imports the old deep path, which monaco-editor 0.57's
      // exports map no longer resolves.
      "monaco-editor/esm/vs/editor/editor.api.js": "monaco-editor/editor/editor.api.js",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
