# Grill Ledger — 로컬 시각 프로토타입 착수 전 결정

**세션 시작:** 2026-08-26
**참조 범위:** `docs/plan-docs/prototype-local-scope.md` · `prototype-suggestion.md` · `docs/tasks/{INF-001,INF-002,UX-001,UX-002,UX-004,UX-006,MCK-001,GRW-003,GRW-005,PLN-004}.md` · `docs/tech-design-docs/[SRS]FinFriends-SRS-v1_0.md`
**관심 방향:** 로컬 시각 프로토타입의 (1) 합의 확인 (2) 착수 전 미확정 사항 해소
**OUTPUT:** `docs/plan-docs/[Spec]Prototype-Visual-Plan.md` (신규) + 하네스 스킬 401 + 앱 구현

**상태:** ■ **CLOSED** — 세션 5 (2026-08-31) 계정·초대 화면 · 17/17 결정
**재개:** 새 질문이 생기면 새 토픽 T18부터 추가한다. RESOLVED 토픽은 다시 묻지 않는다.

```
RESOLVED: 17 / TOTAL: 17
CORE: 11
MINOR: 6
- [x] T1 | CORE  | 확인할 화면 상태 목록 | status:RESOLVED | decision:상태 6종(정상·실천0건·정체14일·첫달·계획넘김·승인대기) · 화면 3종(나무·대조·숲) | applied:[Spec]…§1
- [x] T2 | CORE  | 화면별 정보 구조 — 슬롯 순서와 필수 항목 | depends:T1 | status:RESOLVED | decision:슬롯 순서를 화면 3종 모두 고정 — 나무 5슬롯(①헤더 ②4영역 2×2 ③정체 원인 ④승인 대기 ⑤실천 근거) · 대조 5슬롯 · 숲 4슬롯 | applied:[Spec]…§2 · app/src/components/proto/screens.tsx
- [x] T3 | CORE  | 카피 규약 | status:RESOLVED | decision:기존 아트보드 문구를 정본으로 승계 · D3(콘텐츠 원고) 미결이 프로토타입을 막지 않음 | applied:[Spec]…§3
- [x] T4 | CORE  | 디자인 토큰 실제 값 | status:RESOLVED | decision:아트보드에서 추출 — 크림 #FAF7F1 · 딥그린 #4F7A4A · 테라코타 #B36B3A · 라이트 전용 · 시스템 한글 스택 | applied:[Spec]…§4
- [x] T5 | MINOR | shadcn 컴포넌트 인벤토리 | depends:T1 | status:RESOLVED | decision:7종만 설치 — alert · badge · button · card · progress · select · separator. 목록 밖은 추가 전에 사람에게 묻는다 | applied:[Spec]…§5 · app/src/components/ui/
- [x] T6 | CORE  | 픽스처 데이터의 실체 | status:RESOLVED | decision:아트보드 값 그대로 — 서연·3월·다이소 성수점·문구 5,000원 | applied:[Spec]…§6
- [x] T7 | MINOR | 확인 도구 — 상태 스위처와 뷰포트 | status:RESOLVED | decision:화면 상단 드롭다운 · 모바일 390px 고정 · 데스크톱 가운데 정렬 | applied:[Spec]…§7
- [x] T8 | MINOR | 코드 위치 | status:RESOLVED | decision:같은 저장소 app/ 하위 · node_modules gitignore | applied:.gitignore · app/
- [x] T9 | CORE  | 나무 단계 수 (D6 미결 사양) | status:RESOLVED | decision:3단계 씨앗·새싹·나무로 진행하고 화면에 「예시값」 표시 · D6은 계속 미결로 둔다 | applied:[Spec]…§2 · 화면 고지
- [x] T10| MINOR | 아바타 에셋 부재 (D4 미결 사양) | status:RESOLVED | decision:아동 홈 화면을 범위에서 제외 — 지금 만들면 D4 확정 후 다시 만든다 | applied:prototype-local-scope.md §9
- [x] T11| CORE  | 명세 §4에 없는 색 4종이 코드에 하드코딩됨 | status:RESOLVED | decision:토큰으로 승격 — `--ff-clay-line` `--ff-gold-d` `--ff-gold-bg` `--ff-gold-bg-2`. 명세 §4 표에 추가해 단일 원천을 되돌린다 | applied:[Spec]…§4 · app/src/app/globals.css · screens.tsx
- [x] T12| CORE  | 첫 달(F4)의 나무가 정상(F1)과 같은 슬롯을 씀 | status:RESOLVED | decision:첫 달 전용 슬롯을 만든다 — 벌기 새싹 55% · 잘 쓰기 씨앗 30% · 모으기 씨앗 15%. 숲의 「별 12개 · 첫 달」과 앞뒤가 맞아야 한다 | applied:[Spec]…§6.2.1 · app/src/mocks/fixtures.ts · reports/proto/p1-first.png
- [x] T13| CORE  | 화면 모형(한 페이지 3화면 + 상태 드롭다운)이 동선을 못 보여준다 | status:RESOLVED | decision:라우트 13건 앱으로 전환 — /consent · /parent/{onboarding,tree,forest,missions,spending} · /child/{home,learn,quiz/[topic],plan/new,retro/[recordId],wishlist,stars}. 나무는 우리 SRS대로 보호자 소유(UX-002 · GRW-003) | applied:[Spec]…§1.1 · app/src/app/**
- [x] T14| CORE  | 아동 화면과 보호자 화면의 톤이 갈릴 자리가 없다 | status:RESOLVED | decision:듀얼 테마 — 같은 토큰 이름을 다른 값으로. data-mode 는 ModeFrame 하나만 단다. --ff-miss(테라코타)는 두 모드가 같다 — 보호자라고 빨강으로 바꾸지 않는다 | applied:[Spec]…§4.2 · app/src/app/globals.css
- [x] T15| CORE  | 아바타 에셋 부재(D4)로 아동 홈을 계속 미룰 수 없다 | status:RESOLVED | decision:이모지 조합 + CSS 3D 회전으로 세우고 화면에 「예시」를 적는다. three.js 를 넣지 않는 이유는 REQ-TEC-007 예외를 늘리는 결정이고 D4·B4 게이트를 되살리기 때문이다. ADR-T05가 3D→2.5D 전환의 대가로 「회전이 사라진다」를 적었고 그 전환은 아직 승인 전이라, 회전이 있는 화면을 먼저 만들어 판단 근거로 삼는다. T10(범위 제외)을 이 결정이 대체한다 | applied:app/src/components/child/Avatar.tsx · [Spec]…§4.2.1 · reports/proto/child-home-back.png
- [x] T16| MINOR | shadcn 인벤토리 7종에 입력 컴포넌트가 없다 | depends:T5 | status:RESOLVED | decision:`input` `label` 2종을 `npx shadcn add` 로 추가한다. 계정·로그인 화면은 입력 없이 성립하지 않고, T5가 정한 「직접 재구현 금지」를 지키는 방법은 정식 추가뿐이다. 의존성은 늘지 않았다(@base-ui/react 기설치). 인벤토리는 이제 9종 | applied:app/src/components/ui/{input,label}.tsx
- [x] T17| CORE  | 아이가 자기 기기에서 앱에 들어갈 방법이 명세에 없다 | status:RESOLVED | decision:초대 링크는 **자격증명이 아니라 기기 등록 수단**이다. 부모가 아이 기기에서 링크를 열면 그 기기가 보호자 계정 하위 아동 프로필에 묶이고, 아이는 아무것도 입력하지 않는다 — 아동 아이디·비밀번호 안은 SRS-Tech §6.6(아동 세션은 보호자 세션 하위 프로필로만 성립 · REQ-NF-011 · S5)과 허용 오차 0 항목 6번에 걸려 채택하지 않는다. 초대를 온보딩 4단계로 분리한다(SRS 다이어그램 A의 P4). **미결로 남겼던 2건(①기기 세션 유지 기간 ②부모 화면 복귀 잠금)은 같은 날 어긋남 대장 D5·D5-b 가 확정했다** — 180일 · 보호자 PIN. 화면 문구를 그 값으로 교체했다 | applied:app/src/app/parent/invite/** · app/src/app/join/** · app/src/app/parent/onboarding/onboarding.fixture.ts · [Ops]Spec-Drift-Log.md D5·D5-b
```

---

## 세션 2 결정 (2026-08-27)

### T2 — 화면별 정보 구조 <!-- CORE --> · RESOLVED

**왜 필요했나** — 상태 6종은 정했지만 **각 화면에 무엇이 어떤 순서로 있는지**가 비어 있었다.
그대로 착수하면 에이전트가 슬롯 순서를 매번 다르게 만들고, **세 화면이 서로 다른 규칙**을 갖는다.

특히 **성장 나무 카드**가 이 제품의 핵심 화면이다. 걸린 조건 셋:

| 조건 | 근거 | 어떻게 반영했나 |
| --- | --- | --- |
| 실천 근거가 **기본 노출**돼야 한다 (펼치지 않아도) | REQ-FUNC-001 · AC-1.2 | 슬롯 ⑤를 접히지 않는 블록으로 고정 |
| 정체 시 **미충족 조건 전부** 표시 · 가장 적게 남은 것 최상단 | ACE-3.1 | 슬롯 ③에 `<ol>` 로 전부 나열 · 배열 0번을 굵게 |
| 5초 노출로 **변화가 회상**돼야 한다 | AC-1.1 `≥ 6/8` | 4영역을 2×2로 한 화면에 · 스크롤 없이 |

**결정** — 슬롯 순서를 명세 §2에 고정하고, 코드에서도 순서를 바꿀 수 없게 한 컴포넌트에 붙였다.

| 화면 | 슬롯 순서 |
| --- | --- |
| P1 성장 나무 | ① 헤더(아이·주기) → ② 4영역 2×2 → ③ 정체 원인(조건부) → ④ 승인 대기(조건부) → ⑤ 실천 근거 |
| P2 계획↔실제 | ① 헤더(시점·가맹점) → ② 2열 대조 → ③ 회고 문장 → ④ ⭐ 결과 → ⑤ 「확인했어요」 |
| P3 월간 숲 | ① 한 줄 요약 → ② 획득 별 → ③ 「지난달과 비교」 → ④ 델타 목록 |

조건부 슬롯은 **자리를 비워두지 않는다** — 해당 없으면 렌더하지 않고 아래 슬롯이 올라온다.

### T5 — shadcn 컴포넌트 인벤토리 <!-- MINOR --> · RESOLVED

**왜 필요했나** — C-TEC-004가 shadcn/ui를 못 박았고, D-08이 **자체 구현을 금지**한다.
설치 목록이 없으면 에이전트가 없는 컴포넌트를 직접 만든다.

**결정** — 화면 3종이 실제로 쓰는 **7종만** 설치했다. 스타일 프리셋은 `base-nova`.

`alert` · `badge` · `button` · `card` · `progress` · `select` · `separator`

목록 밖 컴포넌트가 필요해지면 **추가하기 전에 사람에게 묻는다.** 직접 만들지 않는다.

> 실제 구현에서 `card` · `progress` · `alert` 는 화면 안에서 쓰이지 않았다.
> 폰 프레임 안의 밀도(390px 폭에 카드 4장)를 맞추려면 패딩을 전부 덮어써야 해서,
> 프레임 내부는 토큰 기반 소형 블록으로 직접 짰다. **설치는 유지**한다 — 본 개발에서 쓸 자리가 있다.

---

## 이해 확인 (세션 1 · 2026-08-26)

착수 전 **오해하기 쉬운 4가지**를 제시하고 이견이 없음을 확인했다.

| # | 확인한 것 | 흔한 오해 |
| :-: | --- | --- |
| ① | 이 작업은 **태스크를 닫지 않는다** — 각 태스크의 *일부*만 떼어 쓴다 | "L1~L6 끝내면 INF-001·UX-001 완료" |
| ② | 목 데이터는 **나중에 지운다** — 화면 코드는 이어지지만 목은 교체 대상 | "이게 그대로 개발로 이어진다" |
| ③ | 화면 3개 중 **일부만 해도 된다** — 나무·대조가 핵심 | "3개를 다 해야 의미가 있다" |
| ④ | 목표는 **실험 4개의 답** — E1이 3/8이면 다시 그리는 게 성과 | "예쁜 화면을 만드는 것" |

---

## 해소된 블로커

| 의심했던 블로커 | 실제 |
| --- | --- |
| **회고 문장이 없다** (D3 콘텐츠 원고 미결) | ❌ 블로커 아님 — **기존 아트보드에 한글 문구가 이미 있다**. *"적은 대로 잘 썼어요"* · *"계획보다 N원 더 썼어요"* · *"퀴즈만으로는 자라지 않습니다"* |

문장 풀의 **다양성**(재노출률 ≤ 2/8)은 운영 4주 실측 대상이라 프로토타입 범위 밖이다.

---

## 미결 사양과의 관계

프로토타입은 **미결을 확정하지 않는다.** 회피하거나 예시값으로 진행하고, 그 사실을 화면에 남긴다.

| 미결 | 프로토타입 처리 | 확정 시점 |
| :-: | --- | --- |
| **D4** 아바타 사양 | 아동 홈 **제외**로 회피 | 제작 착수 전 |
| **D6** 나무 단계 수치 | 3단계 **예시값** · 화면에 명시 | 프로토타입 착수 전(본 개발) |
| **D3** 콘텐츠 원고 | 아트보드 문구로 **해소** | LRN-001 착수 전 |
| D1 · D2 · D5 · D-01~03 | 이번 범위와 **무관** | — |

---

## 원장 사용 규칙

| # | 규칙 |
| :-: | --- |
| 1 | **RESOLVED 토픽은 다시 묻지 않는다.** 뒤집으려면 새 토픽으로 올린다 |
| 2 | 명세에 없는 화면 요소가 필요해 보이면 **만들지 말고 토픽으로 올린다** |
| 3 | 결정에는 반드시 `applied:` 를 적는다 — **어디에 반영됐는지** 추적할 수 있어야 한다 |
| 4 | 미결 사양(D1~D6)을 **원장에서 확정하지 않는다.** 프로토타입 처리 방식만 정한다 |

---

## 산출물 (세션 2 종료 시점)

| 무엇 | 어디 |
| --- | --- |
| 명세 | `docs/plan-docs/[Spec]Prototype-Visual-Plan.md` |
| 하네스 규칙 | `.agents/skills/401-prototype-visual-rules/SKILL.md` |
| 앱 | `app/` — Next.js 16 · Tailwind v4 · shadcn `base-nova` |
| 목 픽스처 | `app/src/mocks/{types.ts,fixtures.ts}` — 상태 6종 |
| 화면 | `app/src/components/proto/{phone-frame,fixture-switcher,screens}.tsx` |
| 상태 스크린샷 | `reports/proto/` — 화면별 9장 + 전경 3장 |
| 촬영 스크립트 | `tools/shoot_proto.sh` · `tools/trim_shots.py` |

---

## `/goal` 실행 결과 (2026-08-27 · OPS-FINFRIENDS-GOAL-001 v1.2)

실행 기록: [`docs/ops-docs/goal-runs/2026-08-27T1500-proto-local-visual.md`](../ops-docs/goal-runs/2026-08-27T1500-proto-local-visual.md)

| 라운드 | 걸린 것 | 조치 |
| :-: | --- | --- |
| R1 | 게이트 3 실패 — `.tsx` 에 색상 리터럴 5건 | 토큰 4종으로 승격 (T11) |
| R2 | **게이트는 통과했는데 화면이 깨짐** — `globals.css` 에 토큰 정의 누락 | 정의 추가 · 게이트 3을 `verify_tokens.py` 로 교체(v1.1) |
| R3 | 5축 NO-GO 2건 — ① §3.2 F4·P3 문구가 컴포넌트에 박힘 ② `first` 나무가 `normal` 과 동일 | 문구를 픽스처로 회수 · 첫 달 전용 슬롯 (T12) · 게이트 6 신설 · 13장(v1.2) |
| R4 | — | 게이트 6종 통과 · 5축 전건 GO |

**R2가 이 작업의 교훈이다.** 리터럴 수를 세는 게이트는 리터럴을 지우면 통과한다.
지운 자리가 정의된 토큰인지는 아무도 보지 않았고, 별 카드 그러데이션이 사라진 채로 통과했다.
**세는 게이트는 세는 것만 막는다.**

STOP REASON: EVAL_GO

---

## 세션 4 — 라우트 앱 전환 (2026-08-27)

팀 다른 저장소(`hayoungv/finfriends-prd-to-srs` `feat/proto-shell`)의 라우트 구조를 보고
**화면 모형을 앱으로 바꿨다.** 무엇을 가져오고 무엇을 우리 것으로 남겼는지:

| | 가져온 것 | 우리 것으로 남긴 것 |
| --- | --- | --- |
| 구조 | 라우트 13건 · 세그먼트 레이아웃 | 라우트 **구성**은 우리 태스크에서 뽑았다 |
| 테마 | `data-mode` 듀얼 테마 · `@theme inline` | 값은 명세 §4의 우리 팔레트 |
| 목 | co-located `*.fixture.ts` · `PROTO-DATA:` 마커 | 교체 대상은 우리 태스크 ID |
| 나무 소유 | — | **보호자**(UX-002 · GRW-003). 팀원 저장소는 아이 소유다 |
| 경고색 | — | **`--ff-miss` 는 두 모드 모두 테라코타.** 팀원 저장소는 clean 에서 빨강을 쓴다 |

**나무 소유가 갈린 것은 실수가 아니다.** 우리 SRS는 *"보호자가 여는 첫 화면"* 으로 확정했고
원장 T1이 그것을 따랐다. 팀에서 하나로 모을 때 **어느 쪽이 맞는지 정해야 할 항목**이다.

STOP REASON: ROUTE_APP_DONE

---

## 세션 5 — 계정·초대 화면 (2026-08-31)

라우트 5건을 더했다. `/signup` `/login` `/parent/invite` `/join`, 그리고 온보딩 단계 재편.

### T17 — 아이는 어떻게 자기 기기에 들어가나 <!-- CORE --> · RESOLVED

**왜 필요했나** — 온보딩에 「자녀 초대」(다이어그램 A의 P4)가 있는데 **초대가 무엇을 하는 행위인지**가
비어 있었다. 자연스러운 answer는 *"아이에게 아이디와 비밀번호를 만들어 준다"* 인데, 그것이 막힌다.

| 걸리는 곳 | 문장 |
| --- | --- |
| SRS-Tech §6.6 | 아동 세션은 **독립 로그인 없음** · 보호자 세션 하위 프로필로만 성립(REQ-NF-011 · S5) |
| 스킬 304 §1 | 허용 오차 0 항목 6번 — **아동 독립 로그인 시도 0건** · 인증 로그 일 1회 · 위반 시 즉시 알림 |
| CON-001 | *"나중에 막는 방식으로는 「독립 로그인 시도 0건」을 보증할 수 없다"* |
| `schema.prisma` | `GuardianAccount.authRef` 만 있고 `ChildAccount` 에 자격증명 필드가 **없다** |

**그래서 링크의 성격을 바꿨다.** 초대 링크는 자격증명을 만들지 않는다. 부모가 **아이 기기에서**
링크를 열면 그 기기가 아동 프로필에 묶이고, 이후 그 기기는 열자마자 아이 화면이 나온다.
아이는 인증하지 않으므로 「시도」 자체가 발생하지 않는다.

아이 이메일로 초대를 보내는 방식도 함께 뺐다 — 만 14세 미만 아동에게서 이메일 주소를
직접 받는 것이 되고, 현재 수집 항목은 이름과 태어난 해뿐이다.

**미결 2건은 같은 날 닫혔다** — 화면을 만드는 동안 다른 세션이 어긋남 대장 `D5`·`D5-b`로 확정했고,
서버 구현까지 올라왔다(`src/lib/session/device-session.ts` · `src/middleware.ts`).

| # | 미결이었던 것 | 확정 | 원천 |
| :-: | --- | --- | --- |
| ① | 아이 기기 세션 유지 기간 | **180일** · 보호자가 해제할 때까지 | `device-session.ts` `TTL_DAYS` |
| ② | 부모 화면 복귀 잠금 | **보호자 PIN** + `/parent/**` 미들웨어 307 차단 | `D5` · `guardian_accounts.child_mode_pin_hash` |

②의 잠금은 **부모 쪽 가드**이지 아동 자격증명이 아니다 — 넣어도 S5에 걸리지 않는다.

**한 가지가 뒤집혔다.** 초안의 *"부모 로그인이 풀리면 아이 기기도 함께 잠긴다"* 는 `D5-b`가
정면으로 뒤집었다 — 부모가 옆에 없으면 아이가 아무것도 못 하는 것은 *"아이가 스스로 실천한다"* 는
제품 전제와 어긋나기 때문이다. 기기 세션을 보호자 세션과 **분리**했고,
`/join` 화면 문구를 그 결정에 맞춰 고쳤다.

> 🔴 **아직 안 이어졌다** — `issueDeviceToken()` 에 **호출처가 없다.** 서버는 있고 화면도 있는데
> 둘을 잇는 지점(등록 버튼 → 토큰 발급 → 쿠키)이 비어 있다. `CON-001` 착수 때 여기서 만난다.

### 온보딩 5단계 → 6단계

초대를 3단계 「아이 프로필」 안에 두면 *"프로필을 적는 일"* 과 *"기기를 묶는 일"* 이 한 칸에 섞인다.
둘은 다른 행위이고 실패 지점도 다르므로 나눴다.

```
1 보호자 계정 · 2 법정대리인 동의 · 3 아이 프로필 · 4 자녀 초대 · 5 첫 계획 카드 · 6 카드 연결
```

> 🔴 **후속 작업** — US-8 AC3의 퍼널 기준(*"총 소요 중위 ≤10분 · **3단계** 이탈률 ≤30%"*)이
> 5단계 기준으로 쓰여 있다. 단계 번호가 밀렸으므로 **어느 단계를 이탈 관문으로 볼지 다시 정해야 한다.**

STOP REASON: ACCOUNT_INVITE_DONE
