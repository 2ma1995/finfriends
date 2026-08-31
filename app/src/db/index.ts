import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Prisma 단일 인스턴스 — INF-003.
 *
 * 🔴 런타임은 **풀러(`DATABASE_URL` · 6543)** 로만 붙는다.
 *    마이그레이션용 직결(`DIRECT_URL` · 5432)은 `prisma.config.ts` 가 따로 갖는다 (ADR-T04).
 *    서버리스에서 직결로 붙으면 커넥션이 마른다.
 *
 * Prisma 7 은 런타임 커넥션을 **드라이버 어댑터**로 받는다. 스키마에 URL 을 두지 않으므로
 * 앱과 마이그레이션이 같은 값을 쓰는 사고가 구조적으로 막힌다.
 *
 * 서버리스는 매 요청마다 모듈을 다시 평가할 수 있고 개발 중 HMR 도 마찬가지라 전역에 캐시한다.
 *
 * 🔴 여기 말고 다른 곳에서 `new PrismaClient()` 를 부르지 않는다.
 *    `prebuild` 게이트가 그 심볼을 검출한다 (REQ-TEC-004).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function create(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // 런타임에 발견되면 늦다 — 기동 시점에 세운다 (REQ-TEC-013)
    throw new Error("DATABASE_URL 이 없다. app/.env.example 를 참고해 채운다");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? create();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
