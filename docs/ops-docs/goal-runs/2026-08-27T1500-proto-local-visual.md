<!--
실행 파일 — OPS-FINFRIENDS-GOAL-001 v1.0 의 프롬프트 본문만 분리한 것.
원본: docs/ops-docs/[Ops]Goal-Prototype-Local-Visual.md
실행 시각: 2026-08-27 15:00 (KST)
이 파일은 실행 기록이다. 규범을 고치려면 원본을 고치고 다시 분리한다.
-->

/goal

## 1) 작업 핵심 목표 및 범위
- 목표: `docs/plan-docs/prototype-local-scope.md`(PROP-FINFRIENDS-PROTO-002)와 `docs/plan-docs/[Spec]Prototype-Visual-Plan.md`(SPEC-FINFRIENDS-PROTO-001)에 정의된 **로컬 시각 프로토타입 — 화면 3종 × 상태 6종**을 구현 완료 상태로 만들고, 5축 평가가 전건 GO를 낼 때까지 개선한다.
- 시작 지점: `main`. 프로토타입 1차 구현(`3db0344`)이 이미 올라가 있으므로 **새로 만들지 않고 그 위에서 게이트를 통과시킨다.**
- 작업 대상:
  - 앱 코드 — `app/src/app/{layout,page}.tsx`, `app/src/components/proto/**`, `app/src/components/ui/`(shadcn 설치본), `app/src/mocks/{types,fixtures}.ts`, `app/src/app/globals.css`, `app/` 루트 설정 파일
  - 스크린샷 산출물 — `reports/proto/`
  - 결정 기록 — `docs/grill/GRILL_LEDGER.md`
  - 명세 — `docs/plan-docs/[Spec]Prototype-Visual-Plan.md` (구현이 명세를 앞지르면 명세를 따라오게 고친다)
  - 도구 — `tools/shoot_proto.sh` · `tools/trim_shots.py`(촬영) · `tools/split_goal_prompt.py`(이 프롬프트의 분리기)
  - 태스크 10건 — `INF-001`(#1) `INF-002`(#2) `UX-001`(#60) `UX-002`(#61) `UX-004`(#63) `UX-006`(#65) `MCK-001`(#68) `GRW-003`(#31) `GRW-005`(#33) `PLN-004`(#37). **전부 부분 착수**이며 각 태스크의 범위는 로컬 최소안 §2 표의 「어느 태스크의 일부인가」 열까지만이다.
- 작업 자율성: 사용자 승인을 기다리지 않고 종료 조건 도달까지 자율 진행한다. 단 **외부 계정 연결(Vercel·Supabase)·배포·force push·히스토리 재작성은 금지**이므로 애초에 시도하지 않는다.

## 2) 작업 세부 규칙
- 스킬 `401-prototype-visual-rules` 를 먼저 읽고 그 규범 안에서 작업한다. 화면 값이 필요하면 `[Spec]Prototype-Visual-Plan.md` 를 직접 읽는다.
- 라운드 순서는 다음을 따른다:
  1) R1 — 기계 게이트 5종을 돌려 **현재 실패 지점을 먼저 확정**한다. 추측으로 고치지 않는다
  2) R2 — 실패한 게이트만 고친다. 색상 하드코딩은 토큰으로 승격하고 `globals.css` 에 정의한다
  3) R3 — `tools/shoot_proto.sh` 로 스크린샷 12장을 **다시** 찍는다. 코드가 바뀌면 증거도 다시 만든다
  4) R4 — 5축 평가를 수행하고 NO-GO 축만 고친 뒤 R1로 돌아간다
- 커밋은 라운드마다 한다. 커밋 메시지는 한국어, 푸터에 `Refs #<이슈번호>`. **`Closes` 를 쓰지 않는다** — 부분 착수라 이슈가 닫히면 남은 범위가 사라진다.
- 화면 컴포넌트는 `app/src/mocks/types.ts` 만 본다. 픽스처 리터럴(`fixtures.ts`)을 컴포넌트가 직접 import하지 않는다.
- 색상·타이포는 **전부 `--ff-*` 토큰**으로만 쓴다. `.tsx` 안에 `#RRGGBB` 리터럴을 남기지 않는다(INF-002 AC1 · UX-001).
- 미해소 결정 처리 — 원장은 T1~T10이 CLOSED다. 구현 중 새 결정이 필요해지면 **사용자에게 묻지 말고** 명세와 SRS(`docs/tech-design-docs/[SRS]FinFriends-SRS-v1_0.md` §5 추적성 · AC/ACE)를 근거로 결정한 뒤 원장에 `T11` 부터 이어서 기록한다:
  - CORE(화면 구조·카피 틀·토큰 값·픽스처 실체) / MINOR(네이밍·간격·파일명)로 분류
  - 원장 상단에 grep 가능한 카운터를 각각 별도 줄로 유지 — `CORE: N` · `MINOR: M`
  - 각 항목에 `decision:` 과 `applied:` 를 남긴다
- **미결 사양 D4(아바타)·D6(나무 단계)을 확정하지 않는다.** 회피하거나 예시값으로 진행하고 화면에 그 사실을 남긴다.

## 3) 종료 조건 및 종료 방법
- 종료 조건 (아래 중 하나라도 충족되는 순간 루프를 즉시 멈춘다):
  - **기계 게이트 5종이 모두 통과**하고, **동일 라운드에서 5축 평가가 전건 GO** → STOP REASON: EVAL_GO
  - 5축 평가가 **연속 3회 NO-GO** → STOP REASON: EVAL_NOT_CONVERGING
  - 원장 `CORE` 카운터가 **14**에 도달 → STOP REASON: CORE_BUDGET
  - 원장 `MINOR` 카운터가 **15**에 도달 → STOP REASON: MINOR_BUDGET
  - 평가-진행 라운드가 누적 **25**회 도달 → STOP REASON: TURN_CAP
- 종료 방법:
  1) `docs/grill/GRILL_LEDGER.md` 마지막 줄에 `STOP REASON: <원인 코드>` 한 줄을 덧붙인다.
  2) `cd app && npm run build` 를 실행해 exit 0 출력을 대화에 남긴다. **[기계 게이트 1]**
  3) 프로덕션 서버를 띄운 뒤 아래를 실행해 **10줄 전부 `200`** 인 출력을 대화에 남긴다. **[기계 게이트 2]**
     `curl -s -o /dev/null -w "%{http_code} /\n" http://localhost:4312/ ; for f in normal empty stall first over pending; do curl -s -o /dev/null -w "%{http_code} /?fixture=$f\n" "http://localhost:4312/?fixture=$f"; done ; for s in p1 p2 p3; do curl -s -o /dev/null -w "%{http_code} /?shot=$s\n" "http://localhost:4312/?shot=$s"; done`
  4) `grep -rnE '#[0-9a-fA-F]{3,8}' app/src --include='*.tsx' | wc -l` 를 실행해 **`0`** 출력을 대화에 남긴다 (하드코딩 색상 0건 · INF-002 AC1). **[기계 게이트 3]**
  5) `ls app/src/app/layout.tsx app/src/app/page.tsx app/src/mocks/types.ts app/src/mocks/fixtures.ts app/src/components/proto/screens.tsx && ls reports/proto/ | wc -l` 를 실행해 exit 0 과 **`12`** 출력을 대화에 남긴다 (구조 + 스크린샷 12장). **[기계 게이트 4]**
  6) `python3 tools/verify_links.py && python3 tools/verify_docs.py` 를 실행해 **깨진 참조 0건 · 전부 통과** 출력을 대화에 남긴다. **[기계 게이트 5]**
  7) `head -20 docs/grill/GRILL_LEDGER.md ; tail -3 docs/grill/GRILL_LEDGER.md` 를 실행해 `CORE: N` · `MINOR: M` 카운터 줄과 `STOP REASON:` 줄이 보이는 출력을 대화에 남긴다.
  8) 마지막 5축 스코어카드 전문(축별 GO/NO-GO와 **근거로 삼은 증거 경로**)을 대화에 그대로 남긴다.
  9) `git log --oneline origin/main..HEAD` 와 `git status --porcelain` 를 실행해 커밋 목록과 변경 파일이 §1 작업 대상 안에만 있음을 대화에 남긴다.

## 4) 기타 제약조건
- force push 금지 · 히스토리 재작성 금지 · 배포 금지. Vercel·Supabase 어느 것도 연결하지 않는다.
- 수정 금지 — `docs/plan-docs/[TaskList]FinFriends-Task-List.md`, `docs/plan-docs/[Plan]*.md`, `docs/tasks/**`(전부 생성물이다. 고칠 것은 `tools/tasks_data.py` 다), `docs/tech-design-docs/**`, `docs/analysis-docs/**`.
- GitHub 이슈를 닫지 않는다. 프로젝트 필드를 바꾸지 않는다.
- 로컬 최소안 §1을 지킨다 — **테스트 코드·계측 코드·DB/인증 연동을 만들지 않는다.** 성능·접근성을 검증했다고 말하지 않는다.
- 4번째 화면·7번째 상태를 만들지 않는다. **아동 홈을 만들지 않는다**(D4 미결).
- shadcn/ui에 있는 컴포넌트를 직접 작성하지 않는다 (D-08 · REQ-TEC-007). 인벤토리 7종 밖이 필요하면 원장에 토픽으로 올린다.
- `web/landing.html` · `web/service-example.html` · `docs/gtm-docs/**` 는 기획 심화 산출물이다. 이 작업에서 건드리지 않는다.
- §1 작업 대상 밖 파일을 수정하지 않는다.

## 5) 5축 평가 규약
- 평가 시점: **기계 게이트 5종이 모두 통과한 뒤에만** 수행한다. 구현 중간에는 하지 않는다.
- 평가 입력 (경로를 명시해 실제로 열어 본다):
  - 스크린샷 12장 — `reports/proto/*.png`
  - 화면 명세 — `docs/plan-docs/[Spec]Prototype-Visual-Plan.md`
  - 제품 근거 — `docs/tech-design-docs/[SRS]FinFriends-SRS-v1_0.md` §1.4 인용 금지 10항목 · AC-1.1 · AC-1.2 · AC-1.4 · AC-3.2 · ACE-1.1 · ACE-1.2 · ACE-3.1 · P-03
  - 화면 규범 — 스킬 `401-prototype-visual-rules`
  - 구현 코드 — `app/src/components/proto/**`, `app/src/mocks/**`
- 5축 판정 앵커 (이 앵커로만 GO/NO-GO를 매긴다):

  | 축 | GO 조건 |
  | --- | --- |
  | **알아서(coverage)** | 화면 3종 × 상태 6종 **18칸에 빈칸 0**. 조건부 슬롯 ③정체·④승인 대기가 `stall`·`pending` 에서 각각 눈으로 확인된다. 스크린샷 12장이 전건 존재하고 각각 다른 화면을 담고 있다 |
  | **잘(quality)** | 실천 근거가 **접히지 않고 기본 노출**(AC-1.2). 정체 원인이 **전부** 나열되고 가장 적게 남은 것이 최상단(ACE-3.1). **판정형 문구 0건**. SRS §1.4 인용 금지 10항목 위반 0건 |
  | **딱(coherence)** | 용어가 고정된다 — 실천 · 별 · 계획 카드 · 부모(화면). 넘김이 **경고색이 아니고**(테라코타) **별 차감 표현 0건**(P-03). 넘김에도 회고 문장이 똑같이 제시된다 |
  | **깔끔(clarity)** | 390px에서 가로 스크롤 0건. **슬롯 순서가 상태 6종 전부에서 동일**. 「이번 달 획득 별」이 **스크롤 없이** 보인다(AC-1.4) |
  | **센스(consumability)** | **빈 화면 0건**. `empty`·`first` 에 **다음 행동**이 있다(ACE-1.1 · ACE-1.2). 아이 탓으로 읽히는 문구 0건(AC-3.2). D6 「예시값」 고지가 화면에 있다 |

- NO-GO가 나오면 **지적된 축만** 고치고 기계 게이트 5종을 다시 통과시킨 뒤 재평가한다. 라운드마다 **스크린샷을 다시 찍는다.**
- 판정을 임의로 뒤집지 않는다. 앵커 자체가 틀렸다고 판단되면 고치지 말고 **그 사실을 원장에 기록하고 STOP** 한다.
