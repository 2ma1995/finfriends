import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 저장소 루트의 AGENTS.md · CLAUDE.md 가 유일한 원본이다. 여기서 다시 만들지 않는다.
  agentRules: false,

  /**
   * 🔴 **랜딩 문서는 캐시하지 않는다** (어긋남 대장 D70).
   *
   *    미들웨어가 `/` → `/landing.html` 로 rewrite 하면서 같은 헤더를 걸지만,
   *    **정적 파일을 직접 열 수도 있다** (`/landing.html`). 그 길로 들어온
   *    브라우저가 옛것을 붙들면 미들웨어를 고친 보람이 없다. 두 길 다 막는다.
   *
   * 🔴 `/` 는 여기 안 적는다 — 쿠키가 있으면 `/` 는 랜딩이 아니라 앱 화면이고,
   *    그 화면까지 `no-store` 로 만들 이유가 없다. 랜딩 경로만 건다.
   */
  async headers() {
    return [
      {
        source: "/:file(landing\\.html|service-example\\.html)",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
