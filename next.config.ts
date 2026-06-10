import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // data/rounds is read with fs at request time; without this Vercel's
  // file tracing omits it from the serverless bundle and the page renders empty.
  outputFileTracingIncludes: {
    "/": ["./data/rounds/*.json"],
  },
};

export default nextConfig;
