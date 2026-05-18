import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pin workspace root to this project (silence multi-lockfile warning;
  // there is an extraneous lockfile in $HOME from unrelated tooling)
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
