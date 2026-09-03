import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 저장소 루트의 AGENTS.md · CLAUDE.md 가 유일한 원본이다. 여기서 다시 만들지 않는다.
  agentRules: false,

  /**
   * 🔴 **Server Action 몸집 한도를 사진 한도와 맞춘다** (2026-09-03 제보 —
   *    「사진 찍고 «했어요» 를 눌렀는데 오류 페이지가 나와」).
   *
   *    적어 두지 않으면 **기본값이 1MB** 다. 폰 사진은 보통 2~5MB 라
   *    **우리 코드에 닿기도 전에** 잘렸고, 그래서 「사진이 너무 커요」라는
   *    우리 문구가 뜰 자리조차 없었다 — 브라우저 오류 페이지가 나왔다.
   *
   * 🔴 **5MB 가 아니라 4MB 다.** Vercel 함수는 요청 몸집을 4.5MB 로 자른다 —
   *    5MB 로 두면 여기서 통과시켜도 그 앞에서 막힌다. 막는 자리는 하나여야 한다.
   *    `PHOTO_MAX_BYTES` 도 같은 값으로 맞췄다.
   *
   * 🔴 그래도 **폰에서 먼저 줄인다**(`PhotoPicker`). 한도는 마지막 그물이지
   *    평소에 닿을 자리가 아니다 — 아이 회선으로 4MB 를 올리는 건 그 자체로 느리다.
   */
  experimental: {
    serverActions: { bodySizeLimit: "4mb" },
  },

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
