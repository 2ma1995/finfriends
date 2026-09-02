/**
 * 검증 스크립트가 붙을 DB — 어긋남 대장 D64.
 *
 * 🔴 **조용히 딴 DB 로 떨어지는 것을 막는다.**
 *
 *    전에는 스크립트마다 이렇게 적혀 있었다:
 *
 *      const LOCAL = "postgresql://postgres:ff@localhost:55432/finfriends";
 *
 *    `.mjs` 는 `dotenv` 를 안 읽으므로 `DATABASE_URL` 이 **늘 비어 있었고**,
 *    항상 뒤쪽 로컬 도커로 떨어졌다. 앱이 `.env` 로 **Supabase** 를 보게 바뀐 뒤에도
 *    검증 6종은 **로컬 도커를 시험하며 「전건 통과」라고 말했다** —
 *    통과가 아무것도 보장하지 않는 상태였고, 아무도 몰랐다.
 *
 * 🔴 **검증은 버릴 수 있는 DB 에서만 돈다.** 계정·미션·원장을 만들고 지운다 —
 *    팀이 함께 쓰는 Supabase 에서 돌리면 시연 데이터 사이에 시험 계정이 남는다.
 *    실제로 한 번 남겼다. 그래서 `DATABASE_URL`(앱이 쓰는 것)을 **쓰지 않는다.**
 *
 * 🔴 **스키마가 같은지는 따로 본다** — `npm run db:verify` 가 빈 컨테이너에
 *    마이그레이션을 전부 적용해 대조한다. 여기는 **행동**을 본다.
 */

const LOCAL = "postgresql://postgres:ff@localhost:55432/finfriends";

export function verifyDbUrl() {
  const url = process.env.VERIFY_DATABASE_URL ?? LOCAL;

  let host = "?";
  try { host = new URL(url).host; } catch { /* 형식이 깨졌으면 아래에서 걸린다 */ }

  /**
   * 🔴 **앱의 DB 를 실수로 가리켰으면 멈춘다.** 로컬이 아닌 곳에서 돌리려면
   *    `VERIFY_DATABASE_URL` 에 **일부러** 적어야 하고, 그마저 확인을 받는다.
   */
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  if (!isLocal && !process.argv.includes("--i-know-this-is-not-local")) {
    console.error(
      `\n🔴 검증을 로컬이 아닌 DB(${host})에서 돌리려 한다.\n` +
      `   검증은 계정·미션·원장을 만들고 지운다 — 함께 쓰는 DB 에서 돌리면 안 된다.\n\n` +
      `   로컬로 돌리려면:  npm run db:up   (그 뒤 VERIFY_DATABASE_URL 을 지운다)\n` +
      `   정말 여기서 돌리려면:  --i-know-this-is-not-local\n`,
    );
    process.exit(1);
  }

  console.log(`  (대상 DB: ${host})`);
  return url;
}
