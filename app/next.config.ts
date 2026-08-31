import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 저장소 루트의 AGENTS.md · CLAUDE.md 가 유일한 원본이다. 여기서 다시 만들지 않는다.
  agentRules: false,
};

export default nextConfig;
