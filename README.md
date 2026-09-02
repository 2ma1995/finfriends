# 핀프렌즈 (FinFriends)

아이가 금융을 **배운 것을 실제 돈 행동으로 잇고**, 그 변화를 보호자가 읽는 앱.

- 아이는 배우고 실천한다 → ⭐를 받는다
- 보호자는 **성장 나무**로 「배운 것이 행동으로 이어졌는지」를 본다
- 🔴 **학습·퀴즈만으로는 나무가 자라지 않는다.** 실천이 있어야 자란다

기획 문서는 `docs/` 에 있다. 무엇을 만들지는 이미 적혀 있으므로 **정하지 않고 옮긴다.**

| 문서 | 무엇 |
| --- | --- |
| `docs/tech-design-docs/[SRS]FinFriends-SRS-v1_0.md` | 요구사항 (무엇을 만드나) |
| `docs/tech-design-docs/[SRS]FinFriends-SRS-Tech-v1_0.md` | 기술 제약 반영판 · **§6.1 서버 진입점 19개** |
| `docs/plan-docs/[TaskList]FinFriends-Task-List.md` | 태스크 68건 (`CON-001` `PRC-001` …) |
| `docs/ops-docs/[Ops]Spec-Drift-Log.md` | 🔴 **문서와 구현이 갈라진 곳** — 먼저 읽는다 |
| `.agents/skills/` | 작업 규칙 12종 — 아래 참조 |

---

## 처음 받았을 때

### 0. 필요한 것

- **Node 20 이상** (현재 20.20 에서 개발)
- **Docker Desktop** — 로컬 Postgres 를 컨테이너로 띄운다

### 1. 클론과 설치

```bash
git clone git@github.com:2ma1995/finfriends.git
cd finfriends/app
npm install
```

### 2. 환경 변수

```bash
cp .env.example .env
```

`.env` 를 열어 **로컬 검증용 두 줄의 주석을 풀고 위 두 줄을 지운다.**

```
DATABASE_URL="postgresql://postgres:ff@localhost:55432/finfriends"
DIRECT_URL="postgresql://postgres:ff@localhost:55432/finfriends"
```

> 🔴 지금은 **로컬 Postgres** 로 개발한다. 완성 후 Supabase 로 이관하며,
> 그때 바뀌는 것은 **접속 문자열과 `guardian-session.ts` 한 파일**뿐이다
> (어긋남 대장 `D10`). `.env` 는 커밋하지 않는다 — 이 저장소는 공개다.

### 3. DB 띄우고 마이그레이션

```bash
npm run db:up        # Docker Postgres(55432) 기동 + 마이그레이션 전부 적용
npm run db:generate  # Prisma 클라이언트 생성
npm run db:seed      # 개발용 데이터 (시드 보호자 · 아이 「서연」 · 미션 7건)
```

컨테이너를 갈아엎으려면 `tools/dev_db.sh reset`.

### 4. 실행

```bash
npm run dev          # http://localhost:3000
```

브라우저에서 **`/signup`** 으로 가입하면 동의 → 아이 프로필 → 자녀 초대 → 기기 등록까지 이어진다.
화면 전체를 훑어보려면 **`/screens`** (프로토타입 색인 · 실제 동선이 아니다).

### 5. 확인

```

## 🔴 검증이 남긴 것을 거둔다

검증 스크립트는 실제 DB 에 계정을 만든다. **예외가 나면 정리가 덜 된다** —
`catch` 가 `dev_auth.users` 만 지우고 보호자·아이는 남긴다.
그러면 **나무·숲 집계에 섞여 들어간다.** 실제로 두 건이 쌓여 있었다(「루프」·「떠남」).

```bash
npm run db:cleanup          # 미리 보기
npm run db:cleanup -- --yes # 실제로 지운다
```

**사람이 만든 계정과 시드(`dev-guardian`)는 건드리지 않는다.**
판정 기준은 검증 스크립트가 쓰는 이메일 접두사와, **인증 사용자가 없는 고아 보호자**다.

---

## 🔴 검증은 사본을 만들지 않는다

`verify_*.mjs` 일곱 개는 판정 로직을 **베껴** 갖고 있다. DB 불변식은 그렇게 봐도 되지만
**계산 규칙을 베끼면 원본이 바뀌어도 검증이 통과한다.** 실제로 두 번 새어나갔다.

- 나무를 4단계로 바꿨는데 검증은 3단계 사본으로 **통과**했다
- `GUARDIAN_PREFIXES` 가 늘었을 때는 **좋아진 변경인데 실패**했다

그래서 `verify_logic.ts` 를 뒀다 — **`modules/*` · `contracts/*` 를 직접 import** 한다.
`server-only` 때문에 `--conditions=react-server` 로 돌려야 한다(`npm run verify:logic` 이 붙여 준다).

**새 판정 규칙은 여기에 넣는다.** 사본을 하나 더 만들지 않는다.

---

## 화면이 안 바뀔 때

**둘 이상이 같은 저장소를 쓰면 띄워 둔 dev 서버가 낡는다.** 상대가 push 한 것을
내 서버는 모른다. 오늘 이걸로 네 번 헤맸다 — 코드는 고쳐졌는데 화면이 옛것이었다.

```bash
# 🔴 서버를 먼저 끈다. pull 중에 파일이 바뀌면 서버가 옛 코드를 물고 이상하게 죽는다
kill $(lsof -nP -iTCP:3000 -sTCP:LISTEN -t)

git pull --rebase origin main
npm run db:up          # 안 돌린 마이그레이션이 있으면
npm run db:generate    # 🔴 스키마가 바뀌면 필수 — 안 하면 `... is undefined` 로 죽는다
rm -rf .next           # 컴파일 결과가 남아 옛 화면이 나오는 것을 막는다
npm run dev
```

**증상으로 구별하는 법**

| 증상 | 원인 |
| --- | --- |
| 고친 화면이 옛것으로 보인다 | `pull` 안 함 · `.next` 가 낡음 |
| `Cannot read properties of undefined` | `db:generate` 안 함 (스키마가 바뀌었다) |
| 지운 라우트가 200 을 준다 | 그 워크트리에 아직 파일이 있다 |
| 파일에 없는 줄 번호에서 오류가 난다 | 서버가 리베이스 전 코드를 물고 있다 |
| **로그인해도 로그인 화면으로 돌아온다** | 🔴 **DB 컨테이너가 내려갔다.** `docker ps -a \| grep pg` 로 확인 |
| 화면에 제목만 나오고 본문이 없다 | 같은 원인. 셸을 보낸 뒤 터져서 상태 코드도 200 이다 |
| 개발 서버 켠 채로 `npm run build` 를 돌렸다 | `next build` 와 `next dev` 가 `.next` 를 공유한다 |

🔴 **DB 가 내려가면 「로그아웃된 것」처럼 보인다.** 세션 조회가 실패하므로
로그인해도 계속 로그인 화면으로 돌아오고, 로그인 뒤에 있는 화면(튜토리얼 포함)이
전부 안 열린다. **비밀번호를 다시 넣어도 안 된다** — 잘못 넣은 것이 아니다.
맥이 잠들면 컨테이너가 `exit 0` 으로 멈춘다.

```bash
npm run db:up          # 내려간 컨테이너도 다시 올린다
# 그 다음 개발 서버를 다시 띄운다 — 죽은 커넥션을 물고 있다
```

**마이그레이션은 `npm run db:up` 으로 넣는다.** `psql` 로 직접 넣으면 표는 생기는데
`_ff_applied` 에 기록이 안 남고, **새로 클론하는 사람이 DB 를 못 세운다.**

```bash
# 파일과 DB 가 맞는지 확인
comm -3 <(ls app/prisma/migrations | sort) \
        <(docker exec ff-dev-pg psql -U postgres -d finfriends -tAc \
          "select name from public._ff_applied" | tr -d ' ' | sort)
```

---

bash
npm run build                    # prebuild 게이트 + 타입 검사 + 빌드
npm run db:verify                # 스키마 규제 검사 (임시 컨테이너를 새로 띄운다 · 포트 안 쓴다)
node tools/verify_auth.mjs       # 보호자 인증 13건
node tools/verify_consent.mjs    # 동의 게이트 12건
node tools/verify_child.mjs      # 아이 프로필 19건
node tools/verify_mission_loop.mjs  # 미션 승인 → 실천 → 승급 12건
node tools/verify_bank_ledger.mjs   # 아이 통장 · 용돈 원장 21건
npm run verify:withdraw             # 🔴 탈퇴 · 파기 — **실제 withdrawAccount 를 부른다**
npm run verify:rereg                # 기기 해제 → 재등록 — 기록이 이어지는가
node tools/verify_cycle_audit.mjs   # 주기 전환 · 스냅샷 · 원장 정산 10건
npm run verify:logic                # 🔴 순수 판정 — **실제 코드를 부른다** (사본이 아니다)
npm run db:cleanup                  # 검증이 남긴 계정·고아 보호자 거두기 (--yes 로 실제 삭제)
npm run gate:origin                 # 오리진 분리 — 아이 화면에 부모 기능 0건
```

🔴 **검증은 앱의 DB 를 쓰지 않는다** (어긋남 대장 D64). 계정·미션·원장을 만들고
지우므로, 함께 쓰는 DB 에서 돌리면 시연 데이터 사이에 시험 계정이 남는다.

```
앱          DATABASE_URL          .env — 지금은 Supabase
검증        VERIFY_DATABASE_URL   비우면 로컬 도커. 로컬이 아니면 멈춘다
```

**검증을 돌리면 첫 줄에 대상이 찍힌다** — `(대상 DB: localhost:55432)`.
그 줄을 보고 시작한다. 한동안 `.mjs` 가 `dotenv` 를 안 읽어 **늘 로컬로 조용히
떨어졌고**, 앱이 Supabase 로 바뀐 뒤에도 「전건 통과」라고 말했다.

---

## 🔴 여럿이 작업할 때 — 오늘 세 번 사고 난 것

| 하지 말 것 | 무슨 일이 났나 |
| --- | --- |
| **한 폴더를 두 사람(또는 두 AI 창)이 동시에 편집** | 반쯤 된 파일이 섞여 빌드가 깨지고, 남의 작업이 내 커밋에 딸려 들어갔다 |
| **각자 폴더를 파고 DB 를 공유** | 상대가 시드를 돌려 **가입해 둔 계정이 두 번 날아갔다** |
| **상의 없이 같은 표 만들기** | `missions` 표를 둘이 다른 설계로 만들어 충돌했다 |

**규칙 셋**

1. **한 사람 한 브랜치.** 브랜치는 커밋을 나누지만 **작업 폴더는 나누지 못한다.**
   진짜로 동시에 작업할 거면 `git worktree add ../finfriends-<이름> <브랜치>` 로 **폴더까지** 나눈다.
2. **폴더를 나누면 DB 도 나눈다.** `.env` 의 DB 이름을 다르게 준다
   (`finfriends_myname`). 안 나누면 서로의 데이터를 지운다.
3. **표(테이블)를 새로 만들기 전에 말한다.** 마이그레이션은 되돌리기 어렵다.

---

## 브랜치 이름

```
<타입>/<대상>-<짧은 설명>
```

| 예 | 무엇 |
| --- | --- |
| `feat/parent-mission` | 부모 미션 만들기 |
| `feat/child-onboarding` | 아이 첫 진입 |
| `fix/seed-scope` | 시드가 남의 계정을 지우던 것 |
| `docs/readme` | 문서만 |

- **타입**은 커밋 타입과 같다 (`feat` `fix` `refactor` `docs` `test` `chore`)
- **대상**은 `parent` · `child` · 또는 에픽 소문자 (`star` · `plan` · `growth`)
- 한글·공백·대문자를 쓰지 않는다
- `main` 에 직접 커밋하지 않는다. 브랜치를 파고 PR 로 합친다

---

## 커밋 메시지

**전체 규칙은 `.agents/skills/200-git-commit-push-pr/SKILL.md` 가 원본이다.** 요약:

```
<타입>: <무엇이 달라졌는가 — 한 줄>

<왜 그렇게 했는가>
<근거 태스크 ID · 조항>
<검증 결과>
```

| 타입 | 언제 |
| :-: | --- |
| `feat` | 기능 추가 |
| `fix` | 결함 수정 |
| `refactor` | 동작 그대로 구조 변경 |
| `docs` | 문서 |
| `test` | 테스트 |
| `chore` | 도구 · 설정 |

**무엇을 했는지가 아니라 왜 했는지를 적는다.** 무엇은 diff 가 말한다.

```
fix: 시드가 보호자 계정만 비워 「비밀번호는 맞는데 로그인 실패」가 났다

seed.mjs 가 guardian_accounts 를 전부 지우면서 dev_auth.users 는 그대로 뒀다.
그러면 signIn 이 authRef 로 보호자를 못 찾아 BAD_CREDENTIALS 를 돌려준다 —
자격증명은 맞았는데 틀렸다고 답한 것이다.

CON-001. 범위를 dev-guardian 과 그 아이들로 좁혔다.
verify_auth 에 「고아 인증 사용자 0건」 불변식 추가 — 이 버그의 회귀 검사.
```

### 커밋 전에

- [ ] `npm run build` 통과 — **`prebuild` 게이트 5종이 여기서 돈다**
- [ ] 관련 `verify_*.mjs` 통과
- [ ] **내 파일만** 스테이징했는가 (`git status` 로 확인 · `git add -A` 를 피한다)
- [ ] `.env` · 시크릿이 섞이지 않았는가 — **이 저장소는 공개다**
- [ ] 생성물을 손으로 고치지 않았는가 (태스크 리스트 · 이슈 · 실행 계획은 `tools/*.py` 산출물)

---

## PR

- 제목에 **태스크 ID** (`PRC-001`)
- 본문에 **수용 기준 충족 여부** — 특히 **실패 흐름**
- 규제 항목을 건드렸으면 **어떤 검사로 확인했는지**
- 문서와 어긋나게 만들었으면 **`docs/ops-docs/[Ops]Spec-Drift-Log.md` 에 항목을 추가**한다

---

## 작업 규칙 (`.agents/skills/`)

착수 전에 해당하는 것을 읽는다. **여기 없는 것을 지어내지 않는다.**

| 스킬 | 언제 |
| --- | --- |
| `400-task-execution-workflow` | 태스크를 시작할 때 |
| `301-server-boundary-rules` | 서버 진입점을 만들 때 — **§6.1 표에 있는지 먼저 확인** |
| `302-data-access-rules` | 스키마·마이그레이션·쿼리 |
| `304-compliance-gates` | 🔴 **아동 개인정보·금융 규제** — 허용 오차 0 항목 7가지 |
| `300-tech-constraints-guardrails` | 라이브러리를 추가하고 싶을 때 |
| `200-git-commit-push-pr` | 커밋·PR |
| `101-build-and-env-setup` | 환경이 깨졌을 때 |

### 절대선 — 협상 불가

`304-compliance-gates` 의 일곱 항목은 **「낮게 유지」가 아니라 「없음」**이 기준이다.

- 동의 전 아동 화면 진입 **0건**
- 위치 좌표 · 얼굴 이미지 필드 **0건** (있으면 빌드 실패)
- 별↔저금통 전환 경로 **0건** — 기능 플래그로 막는 것도 안 된다
- 아동 독립 로그인 **0건** — 아이는 아이디·비밀번호를 갖지 않는다
- 별 원장 정합성 오류 **0%**

---

## 구조

```
app/
  prisma/          스키마 · 마이그레이션 · 시드
  src/
    app/           라우트 (parent/** child/** 세그먼트)
      actions/     Server Action — 접두어 없으면 아이, parent- 면 보호자
    contracts/     타입 계약. 🔴 화면은 Prisma 모델을 보지 않는다
    modules/       도메인 로직. index.ts 가 유일한 공개 표면
    lib/session/   보호자 세션 · 기기 세션 · 아동 모드
    db/            Prisma 단일 인스턴스
  tools/           검증 스크립트
docs/              SRS · 태스크 · 어긋남 대장
tools/             문서 생성기 · DB 스크립트
```

**스키마가 두 개로 나뉘어 있다.** `identity`(아이 식별정보) / `activity`(학습·실천).
🔴 **둘을 조인하지 않는다** — 규제 요건이며 감사에서 검출된다. 이름이 필요하면 애플리케이션에서 합친다.
