# [운영] `/goal` 프롬프트 — 로컬 시각 프로토타입

**문서 ID:** OPS-FINFRIENDS-GOAL-001

**개정 버전:** 1.2

**날짜:** 2026-08-27

**대상 작업:** [PROP-FINFRIENDS-PROTO-002](../plan-docs/prototype-local-scope.md) — 작업 6가지(L1~L6) · 6영업일

**화면 명세:** [SPEC-FINFRIENDS-PROTO-001](../plan-docs/%5BSpec%5DPrototype-Visual-Plan.md)

**결정 원장:** [`docs/grill/GRILL_LEDGER.md`](../grill/GRILL_LEDGER.md)

**화면 규범:** 스킬 [`401-prototype-visual-rules`](../../.agents/skills/401-prototype-visual-rules/SKILL.md)

> 📝 **Claude Code `/goal` 에 붙여넣는 프롬프트다.** 아래 코드블록 전체를 그대로 복사해 쓴다.
> 완료 판정이 두 겹이다 — **기계 게이트 6종**(명령으로 판정)과 **5축 전건 GO**(증거로 판정).
> 둘 다 통과해야 끝난다. 실행할 때마다 프롬프트 본문을 `goal-runs/` 에 시각을 박아 분리 보관한다.

---

## 프롬프트

```markdown
/goal

## 1) 작업 핵심 목표 및 범위
- 목표: `docs/plan-docs/prototype-local-scope.md`(PROP-FINFRIENDS-PROTO-002)와 `docs/plan-docs/[Spec]Prototype-Visual-Plan.md`(SPEC-FINFRIENDS-PROTO-001)에 정의된 **로컬 시각 프로토타입 — 화면 3종 × 상태 6종**을 구현 완료 상태로 만들고, 5축 평가가 전건 GO를 낼 때까지 개선한다.
- 시작 지점: `main`. 프로토타입 1차 구현(`3db0344`)이 이미 올라가 있으므로 **새로 만들지 않고 그 위에서 게이트를 통과시킨다.**
- 작업 대상:
  - 앱 코드 — `app/src/app/{layout,page}.tsx`, `app/src/components/proto/**`, `app/src/components/ui/`(shadcn 설치본), `app/src/mocks/{types,fixtures}.ts`, `app/src/app/globals.css`, `app/` 루트 설정 파일
  - 스크린샷 산출물 — `reports/proto/`
  - 결정 기록 — `docs/grill/GRILL_LEDGER.md`
  - 명세 — `docs/plan-docs/[Spec]Prototype-Visual-Plan.md` (구현이 명세를 앞지르면 명세를 따라오게 고친다)
  - 도구 — `tools/shoot_proto.sh` · `tools/trim_shots.py`(촬영) · `tools/verify_tokens.py`(토큰) · `tools/verify_proto_copy.py`(상태 문구) · `tools/split_goal_prompt.py`(이 프롬프트의 분리기)
  - 태스크 10건 — `INF-001`(#1) `INF-002`(#2) `UX-001`(#60) `UX-002`(#61) `UX-004`(#63) `UX-006`(#65) `MCK-001`(#68) `GRW-003`(#31) `GRW-005`(#33) `PLN-004`(#37). **전부 부분 착수**이며 각 태스크의 범위는 로컬 최소안 §2 표의 「어느 태스크의 일부인가」 열까지만이다.
- 작업 자율성: 사용자 승인을 기다리지 않고 종료 조건 도달까지 자율 진행한다. 단 **외부 계정 연결(Vercel·Supabase)·배포·force push·히스토리 재작성은 금지**이므로 애초에 시도하지 않는다.

## 2) 작업 세부 규칙
- 스킬 `401-prototype-visual-rules` 를 먼저 읽고 그 규범 안에서 작업한다. 화면 값이 필요하면 `[Spec]Prototype-Visual-Plan.md` 를 직접 읽는다.
- 라운드 순서는 다음을 따른다:
  1) R1 — 기계 게이트 6종을 돌려 **현재 실패 지점을 먼저 확정**한다. 추측으로 고치지 않는다
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
  - **기계 게이트 6종이 모두 통과**하고, **동일 라운드에서 5축 평가가 전건 GO** → STOP REASON: EVAL_GO
  - 5축 평가가 **연속 3회 NO-GO** → STOP REASON: EVAL_NOT_CONVERGING
  - 원장 `CORE` 카운터가 **14**에 도달 → STOP REASON: CORE_BUDGET
  - 원장 `MINOR` 카운터가 **15**에 도달 → STOP REASON: MINOR_BUDGET
  - 평가-진행 라운드가 누적 **25**회 도달 → STOP REASON: TURN_CAP
- 종료 방법:
  1) `docs/grill/GRILL_LEDGER.md` 마지막 줄에 `STOP REASON: <원인 코드>` 한 줄을 덧붙인다.
  2) `cd app && npm run build` 를 실행해 exit 0 출력을 대화에 남긴다. **[기계 게이트 1]**
  3) 프로덕션 서버를 띄운 뒤 아래를 실행해 **10줄 전부 `200`** 인 출력을 대화에 남긴다. **[기계 게이트 2]**
     `curl -s -o /dev/null -w "%{http_code} /\n" http://localhost:4312/ ; for f in normal empty stall first over pending; do curl -s -o /dev/null -w "%{http_code} /?fixture=$f\n" "http://localhost:4312/?fixture=$f"; done ; for s in p1 p2 p3; do curl -s -o /dev/null -w "%{http_code} /?shot=$s\n" "http://localhost:4312/?shot=$s"; done`
  4) `python3 tools/verify_tokens.py` 를 실행해 **색상 리터럴 0건 · 정의되지 않은 토큰 0종 · 전부 통과** 출력을 대화에 남긴다 (INF-002 AC1 · UX-001). **[기계 게이트 3]**
  5) `ls app/src/app/layout.tsx app/src/app/page.tsx app/src/mocks/types.ts app/src/mocks/fixtures.ts app/src/components/proto/screens.tsx && ls reports/proto/ | wc -l` 를 실행해 exit 0 과 **`13`** 출력을 대화에 남긴다 (구조 + 스크린샷 13장). **[기계 게이트 4]**
  6) `python3 tools/verify_links.py && python3 tools/verify_docs.py` 를 실행해 **깨진 참조 0건 · 전부 통과** 출력을 대화에 남긴다. **[기계 게이트 5]**
  7) `python3 tools/verify_proto_copy.py` 를 실행해 **명세 §3.2 확정 문구 전건 일치** 출력을 대화에 남긴다 (상태 문구가 `src/mocks/` 밖으로 새지 않았는가 · 스킬 401). **[기계 게이트 6]**
  8) `head -20 docs/grill/GRILL_LEDGER.md ; tail -3 docs/grill/GRILL_LEDGER.md` 를 실행해 `CORE: N` · `MINOR: M` 카운터 줄과 `STOP REASON:` 줄이 보이는 출력을 대화에 남긴다.
  9) 마지막 5축 스코어카드 전문(축별 GO/NO-GO와 **근거로 삼은 증거 경로**)을 대화에 그대로 남긴다.
  10) `git log --oneline origin/main..HEAD` 와 `git status --porcelain` 를 실행해 커밋 목록과 변경 파일이 §1 작업 대상 안에만 있음을 대화에 남긴다.

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
- 평가 시점: **기계 게이트 6종이 모두 통과한 뒤에만** 수행한다. 구현 중간에는 하지 않는다.
- 평가 입력 (경로를 명시해 실제로 열어 본다):
  - 스크린샷 13장 — `reports/proto/*.png`
  - 화면 명세 — `docs/plan-docs/[Spec]Prototype-Visual-Plan.md`
  - 제품 근거 — `docs/tech-design-docs/[SRS]FinFriends-SRS-v1_0.md` §1.4 인용 금지 10항목 · AC-1.1 · AC-1.2 · AC-1.4 · AC-3.2 · ACE-1.1 · ACE-1.2 · ACE-3.1 · P-03
  - 화면 규범 — 스킬 `401-prototype-visual-rules`
  - 구현 코드 — `app/src/components/proto/**`, `app/src/mocks/**`
- 5축 판정 앵커 (이 앵커로만 GO/NO-GO를 매긴다):

  | 축 | GO 조건 |
  | --- | --- |
  | **알아서(coverage)** | 화면 3종 × 상태 6종 **18칸에 빈칸 0**. 조건부 슬롯 ③정체·④승인 대기가 `stall`·`pending` 에서 각각 눈으로 확인된다. 스크린샷 13장이 전건 존재하고 각각 다른 화면을 담고 있다 |
  | **잘(quality)** | 실천 근거가 **접히지 않고 기본 노출**(AC-1.2). 정체 원인이 **전부** 나열되고 가장 적게 남은 것이 최상단(ACE-3.1). **판정형 문구 0건**. SRS §1.4 인용 금지 10항목 위반 0건 |
  | **딱(coherence)** | 용어가 고정된다 — 실천 · 별 · 계획 카드 · 부모(화면). 넘김이 **경고색이 아니고**(테라코타) **별 차감 표현 0건**(P-03). 넘김에도 회고 문장이 똑같이 제시된다 |
  | **깔끔(clarity)** | 390px에서 가로 스크롤 0건. **슬롯 순서가 상태 6종 전부에서 동일**. 「이번 달 획득 별」이 **스크롤 없이** 보인다(AC-1.4) |
  | **센스(consumability)** | **빈 화면 0건**. `empty`·`first` 에 **다음 행동**이 있다(ACE-1.1 · ACE-1.2). 아이 탓으로 읽히는 문구 0건(AC-3.2). D6 「예시값」 고지가 화면에 있다 |

- NO-GO가 나오면 **지적된 축만** 고치고 기계 게이트 6종을 다시 통과시킨 뒤 재평가한다. 라운드마다 **스크린샷을 다시 찍는다.**
- 판정을 임의로 뒤집지 않는다. 앵커 자체가 틀렸다고 판단되면 고치지 말고 **그 사실을 원장에 기록하고 STOP** 한다.
```

---

## 붙여넣기 전에 조정할 수 있는 값

| 값 | 현재 | 조정 판단 |
| --- | --- | --- |
| turn cap | **25** | 1차 구현이 이미 있어 레퍼런스(40)보다 낮췄다. 게이트 수리 + 평가 2~3라운드를 상정한 값 |
| `CORE` budget | **14** | 원장이 T10까지 CLOSED다. 여유 4를 얹었다. 새 결정을 직접 내리고 싶으면 11로 낮춰 조기 정지 |
| `MINOR` budget | **15** | 네이밍·간격 수준. 넉넉한 편이다 |
| 연속 NO-GO 한도 | **3** | 평가가 수렴하지 않을 때의 탈출구 |
| 시작 브랜치 | `main` | 1차 구현이 main에 있다. 별도 브랜치로 가려면 `feat/proto-local-visual` 를 파고 §1을 고친다 |
| 서버 포트 | **4312** | 촬영 스크립트(`tools/shoot_proto.sh`)의 기본값과 맞췄다 |

## 왜 완료 판정을 두 겹으로 두었나

기계 게이트만 두면 **화면이 뜨기만 해도 통과**한다. 평가만 두면 판정이 라운드마다 흔들린다.
그래서 앞의 다섯은 명령으로, 마지막 하나는 **5축 앵커로 고정한 평가**로 나눴다. 앵커를 표로 못 박은 이유도 같다 —
"충분한 사용자 경험"은 그대로 두면 측정할 수 없고, 볼 때마다 다른 답이 나온다.

## 레퍼런스와 다른 점

이 문서는 `wild-mental/ai-place-mate-prd-to-srs` 의 `OPS-AIPLACE-GOAL-001` 구조를 따랐다.
**다르게 한 세 가지**와 이유:

| # | 레퍼런스 | 여기 | 왜 |
| :-: | --- | --- | --- |
| 1 | 기계 게이트 **4종** | **6종** — `verify_links.py` · `verify_docs.py` · `verify_proto_copy.py` 추가 | 이 저장소는 태스크 문서가 **생성물**이고 링크 검사기를 갖고 있다. 문서가 깨진 채로 GO가 나오면 안 된다 |
| 2 | `aztks-agent` 서브에이전트가 EVALUATE | **자체 5축 평가 · 증거 경로 필수** | 이 환경에 해당 에이전트가 없다. 대신 축마다 **근거로 삼은 파일 경로를 스코어카드에 남기게** 해서 자평을 검증 가능하게 만들었다. 평가자 에이전트가 생기면 §5의 「평가 입력」을 그대로 넘기면 된다 |
| 3 | `feat/proto-local-visual` 브랜치를 새로 판다 | **`main` 에서 이어간다** | 1차 구현이 이미 main에 푸시돼 GitHub Project와 물려 있다. 지금 브랜치를 파면 사용자가 보던 화면이 갈라진다. 대신 force push·히스토리 재작성을 금지했다 |

## 실행 기록

프롬프트 본문은 실행할 때마다 `goal-runs/YYYY-MM-DDTHHMM-<슬러그>.md` 로 분리해 남긴다.
**규범을 고칠 때는 이 원본을 고치고 다시 분리한다.** 실행 기록을 직접 고치지 않는다.

```sh
python3 tools/split_goal_prompt.py "docs/ops-docs/[Ops]Goal-Prototype-Local-Visual.md" proto-local-visual
```

손으로 자르면 원본과 어긋난다. 분리기는 `## 프롬프트` 아래 ```` ```markdown ```` 펜스 안쪽만 꺼낸다.

| 실행 시각 | 파일 | 결과 |
| --- | --- | --- |
| 2026-08-27 15:00 KST | [`goal-runs/2026-08-27T1500-proto-local-visual.md`](goal-runs/2026-08-27T1500-proto-local-visual.md) | 진행 중 (v1.0 시점 본문 · 얼려 둔다) |

---

**OPS-FINFRIENDS-GOAL-001 · v1.2 · 2026-08-27 · 기계 게이트 6종 + 5축 앵커 · turn cap 25**

> v1.2 — 게이트 **6종**으로 늘리고 스크린샷을 12 → **13장**으로 올렸다. 라운드 3의 5축 평가에서 둘이 걸렸다.
> ① 명세 §3.2가 확정 전문으로 못 박은 F4·P3 문구가 **픽스처가 아니라 화면 컴포넌트에 박혀** 있었다 → `verify_proto_copy.py` 가 명세 표를 직접 읽어 대조한다.
> ② `first` 상태의 나무가 `normal` 과 **같은 슬롯**을 써서, 가입 첫 달인데 벌기가 이미 100%였다. 같은 상태가 P1과 P3에서 다른 말을 했다 → 첫 달 전용 슬롯을 만들고 `p1-first.png` 를 증거에 넣었다.
>
> v1.1 — 게이트 3을 `grep` 한 줄에서 `tools/verify_tokens.py` 로 바꿨다. 라운드 2에서 **게이트가 통과했는데 화면이 깨지는** 일이 실제로 났다.
> 색상 리터럴을 토큰으로 바꾸면서 `globals.css` 에 정의를 빠뜨렸고, `.tsx` 는 깨끗해 보였지만 브라우저는 `var()` 가 미정의라 선언 전체를 버렸다.
> 별 카드 그러데이션이 사라지고 별 숫자가 상속색으로 바뀌었는데 **리터럴 수는 0** 이었다.
> 게이트는 **세는 장치**이지 품질 기준이 아니다. 세는 것만으로 뚫리는 구멍이 보이면 그만큼 넓힌다.
> 실행 기록(`goal-runs/*.md`)은 붙여넣은 시점의 본문이므로 **다시 분리하지 않는다.**
