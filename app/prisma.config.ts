import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI 설정 — 🔴 **마이그레이션 전용 커넥션**이 여기 산다.
 *
 * 경로를 둘로 나눈다 (ADR-T04 · REQ-TEC-005 · INF-003)
 *   여기(`DIRECT_URL`)      직결 · 5432 — 마이그레이션. 풀러의 트랜잭션 모드에서는 DDL 이 깨진다
 *   런타임(`DATABASE_URL`)  풀러 · 6543 — `src/db/index.ts` 가 PrismaClient 에 직접 넘긴다
 *
 * Prisma 7 은 config 의 `datasource.url` 을 **CLI 만** 쓴다.
 * 그래서 둘을 섞을 수가 없다 — 분리가 구조로 강제된다.
 */
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
