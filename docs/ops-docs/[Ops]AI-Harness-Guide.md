# [운영] AI 개발 하네스 가이드

**문서 ID:** OPS-FINFRIENDS-HARNESS-001

**개정 버전:** 1.0

**날짜:** 2026-08-26

> **이 하네스의 목적은 하나다** — AI 코딩 도구가 **기술 제약을 조용히 우회하는 것을 막는 것**.
> 에이전트는 기본적으로 "더 나은 대안"을 권한다. Redis · Kafka · 별도 백엔드 · 외부 CI는
> 일반적으로는 좋은 선택이지만 **이 프로젝트에서는 금지**다.

---

## 1. 구성

```
AGENTS.md              도구 공통 규칙 — Claude Code · Cursor · Gemini CLI · Codex 등이 공유
CLAUDE.md              Claude Code 진입점 — 짧게 두고 스킬로 라우팅
skills-lock.json       외부 스킬 도입 현황 — 현재 0건 (후보 7 · 제외 3)
.agents/
  rules/       3종     프로젝트 개요 · 기술 스택 · 개발 규범
  skills/     12종     상황별로 꺼내 읽는 지침
  workflows/   2종     태스크 도출 · 규칙 추가 절차
.claude/
  agents/      4종     서브에이전트
  skills/     12개     → .agents/skills/* 심링크
```

## 2. 스킬 12종

| 번호 | 스킬 | 언제 읽나 |
| :-: | --- | --- |
| 100 | `error-fixing-process` | 오류를 고칠 때 |
| 101 | `build-and-env-setup` | 빌드·환경 변수가 깨졌을 때 |
| 200 | `git-commit-push-pr` | 커밋·PR을 만들 때 |
| 201 | `code-commenting` | 주석을 쓸 때 |
| 202 | `github-issue-handling` | 이슈·프로젝트를 다룰 때 |
| **300** | **`tech-constraints-guardrails`** | **라이브러리를 추가하거나 "더 나은 대안"이 떠올랐을 때** |
| 301 | `server-boundary-rules` | Server Action / Route Handler / RSC 선택 |
| 302 | `data-access-rules` | 스키마 · 마이그레이션 · RLS · 커넥션 |
| 303 | `no-ai-by-default` | **AI를 쓰고 싶어질 때** |
| **304** | **`compliance-gates`** | **규제·보안 항목을 건드릴 때** |
| 400 | `task-execution-workflow` | 태스크를 구현으로 옮길 때 |
| 401 | `prototype-visual-rules` | **프로토타입 화면을 만들 때** — 목 경계 · 상태 6종 · 슬롯 순서 |

**300과 304가 이 하네스의 핵심**이다. 나머지는 보조다.

## 3. 서브에이전트 4종

| 에이전트 | 담당 | 물고 있는 스킬 |
| --- | --- | --- |
| `nextjs-server` | Server Action · Route Handler · RSC | 301 · 300 · 302 |
| `prisma-data` | 스키마 · 마이그레이션 · RLS · 쿼리 | 302 · 304 · 300 |
| `ui-shadcn` | 화면 · Tailwind · shadcn/ui | 300 · 301 · 304 |
| `compliance-gate` | 규제 항목 검증 · 게이트 스크립트 | 304 · 302 · 300 |

## 4. 🔴 다른 프로젝트의 하네스를 그대로 쓰면 안 되는 이유

이 하네스는 **레퍼런스 사례의 구조를 빌리되 내용은 우리 스택으로 다시 썼다.** 그대로 두면
에이전트가 **이 프로젝트에서 금지된 구성요소를 권하게 된다.**

| 항목 | 일반적인 Next.js 프로젝트 | **우리** |
| --- | --- | --- |
| 배치 | Vercel Cron Jobs | 🔴 **Supabase `pg_cron`** — 무료 요금제 일 1회로는 6시간 요건 미달(ADR-T02) |
| AI | Vercel AI SDK + Gemini 활용 | 🔴 **호출 0건** — REQ-TEC-015 유보 |
| 데이터 | 단일 스키마 | 🔴 **`identity`/`activity` 분리 + RLS** — 결합 조회는 규제 위반 |
| 게이트 | CI 파이프라인 | 🔴 **`prebuild` 5종** — 외부 CI 금지 |
| 규제 | 일반 | 🔴 **허용 오차 0인 항목 7가지** |

> 스킬 `303-no-ai-by-default` 는 **일반 하네스와 정반대**다. 보통은 *"AI를 이렇게 써라"* 인데
> 여기서는 *"쓰지 마라"* 다. 이 프로젝트에 AI 요구사항이 0건이기 때문이다.

## 5. 외부 스킬은 도입하지 않았다

`skills-lock.json` 에 **후보 7종과 출처만** 기록했고 **내용을 복사하지 않았다.**

| 상태 | 항목 |
| --- | --- |
| **도입** | 0건 |
| **후보** | prisma-client-api · prisma-database-setup · supabase · supabase-postgres-best-practices · shadcn · tdd · webapp-testing |
| **제외** | `ai-sdk`(AI 미사용) · vercel-react-best-practices · web-design-guidelines |

도입할 때는 출처 저장소에서 가져와 `.agents/skills/` 에 두고 `vendored` 에 해시를 기록한다.

## 6. ⚠️ 심링크 주의

`.claude/skills/*` 는 `.agents/skills/*` 로의 **심링크**다. 원본을 한 곳에 두어 내용이 갈라지지 않게 한 것이다.

**Windows에서는 심링크가 깨질 수 있다.** 그 경우 복사본으로 바꾼다.

```bash
rm -rf .claude/skills && mkdir -p .claude/skills
cp -R .agents/skills/* .claude/skills/
```

복사본으로 바꾸면 **내용이 갈라질 수 있으니** 수정은 항상 `.agents/skills/` 에 하고 다시 복사한다.

## 7. 규칙을 추가할 때

`.agents/workflows/generate-agent-rule.md` 를 따른다. 요약하면

- 번호 대역 — 100 프로세스 · 200 협업 · **300 제약 가드레일** · 400 실행 절차
- `description` 에 **언제 읽어야 하는지**를 적는다
- **금지에는 대안과 이유를 함께** 적는다. 금지만 하면 우회한다
- 우리 문서의 ID(`REQ-TEC-002` · `ADR-T02` · `P-21`)를 인용해 근거를 되짚을 수 있게 한다

## 8. 하네스가 막지 못하는 것

정직하게 남긴다.

| 한계 | 내용 |
| --- | --- |
| **읽지 않으면 소용없다** | 스킬은 에이전트가 꺼내 읽어야 작동한다. 강제력은 `prebuild` 게이트에만 있다 |
| **문서와 코드의 괴리** | SRS가 바뀌어도 하네스는 자동으로 갱신되지 않는다 |
| **미해소 3건** | D-01 · D-02 · D-03은 **사람이 결정해야** 한다. 에이전트가 임의로 정하는 것을 문서로만 막고 있다 |

**진짜 방어선은 `prebuild` 5종**이다. 하네스는 그 앞에서 사고를 줄일 뿐이다.
