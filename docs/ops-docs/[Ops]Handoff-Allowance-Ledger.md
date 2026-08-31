# [운영] 인계 — 용돈 원장을 통장 화면으로 가져가기

**문서 ID:** OPS-FINFRIENDS-HANDOFF-001 · **작성:** 2026-08-31
**보내는 쪽:** `feat/child-room` (아이 화면) · **받는 쪽:** `feat/parent-mission` (부모 통장)
**왜 있는가** — 같은 기능을 양쪽이 따로 만들었다. **통장 화면은 그쪽이 맡고,
잔액 구조는 이쪽 원장을 쓰기로 했다**(2026-08-31 사용자 결정). 코드만 넘기면
**왜 그렇게 짰는지가 사라지므로** 그 이유를 함께 적는다.

---

## 1. 무엇이 겹쳤나

| | `feat/parent-mission` (그쪽) | `feat/child-room` (이쪽) |
| --- | --- | --- |
| 잔액 | `identity.guardian_accounts.mock_balance_won` **컬럼** | `activity.allowance_ledger` **원장** |
| 화면 | `/parent/bank` 아이 통장(보호자용) | `/parent/allowance` 용돈 주기 |
| 그쪽만 있는 것 | **카드 발급 단계** · **이자율 설정** | — |
| 이쪽만 있는 것 | — | 되돌리기 · 아이 용돈 기입장 · 카드 내역 대조 |

**DB 에는 이미 둘 다 들어가 있다.** 같은 `ff-dev-pg` 를 쓴다.

---

## 2. 🔴 마이그레이션 번호가 충돌했다

`11` · `12` · `13` 을 양쪽이 각각 다른 이름으로 썼다.

| 번호 | 그쪽 | 이쪽 |
| :-: | --- | --- |
| 11 | `mock_card` | `lesson_progress` |
| 12 | `mock_card_steps` | `practice_from_lesson` |
| 13 | `bank` | `allowance` |
| 14 | — | `card_txn` |

`_ff_applied` 에는 **이쪽 이름만** 적혀 있다. 그쪽 3개는 DB 에 반영돼 있는데 기록이 없다.

**합칠 때 할 일**
1. 그쪽 3개를 `20260831000015_` 이후로 **번호만** 다시 매긴다 (내용은 그대로 — 이미 적용돼 있으므로 새 DB 에서만 순서가 의미 있다)
2. `_ff_applied` 에 그쪽 이름을 넣는다
3. 앞으로 **번호를 잡기 전에 `_ff_applied` 를 먼저 본다**

---

## 3. 🔴 지켜야 하는 것 넷 — 이유와 함께

### ① 잔액을 컬럼에 저장하지 않는다

`mock_balance_won` 은 숫자 하나뿐이라 **기록이 남지 않는다.**
별 원장(`star_ledger`)에서 이미 지키고 있는 규율의 반대다 — **합이 잔액이다**(REQ-NF-006).

- 잔액이 틀어졌을 때 **왜 그런지 아무도 못 본다**
- 「잘못 적은 줄 되돌리기」가 성립하지 않는다. 되돌릴 줄이 없으므로
- 아이 용돈 기입장(`/child/allowance`)이 그릴 게 없다 —
  두 공개 자료가 **가장 강조하는 실천이 용돈기입장 쓰기**인데 그 화면이 못 나온다

### ② 금액을 `identity` 에 두지 않는다

`guardian_accounts` 는 **식별정보** 스키마다. 금액·활동은 `activity` 여야
결합 조회 차단(REQ-NF-009 · S3)이 유지된다. 두 스키마에 **역할이 갈려 있는 것이 요건**이다.

그리고 **보호자별 잔액이라 아이가 둘이면 구분되지 않는다.** 원장은 `child_id` 로 잡는다.

### ③ 0 밑으로 내려가지 않는다

없는 돈을 쓴 것으로 적으면 장부가 현실과 어긋나고, **그때부터 화면이 무의미해진다.**
`record()` 가 거래 안에서 합을 다시 세고 막는다.

### ④ 중복은 정상 경로다

멱등키로 막는다(REQ-NF-003 오프라인 큐). 연타·재전송이 두 번 빠지지 않는다.
**오류가 아니라 「이미 적힌 것」으로 돌려준다.**

---

## 4. 가져갈 코드

| 파일 | 무엇 |
| --- | --- |
| `app/prisma/migrations/20260831000013_allowance/` | 표 + 열거형 + RLS |
| `app/src/modules/allowance/index.ts` | `getBalance` · `getHistory` · `record` · `topUp` · `reverseEntry` |
| `app/src/app/actions/allowance.ts` | `topUpAction` · `reverseEntryAction` |
| `app/src/app/parent/allowance/` | 화면 — **`/parent/bank` 안으로 옮기고 삭제** |
| `app/src/app/child/allowance/` | 아이 용돈 기입장 — 이쪽이 계속 맡는다 |

### 원장 코드 5종

```
TOPUP           보호자가 용돈을 줬다고 적는다        (+)
WISH_SET_ASIDE  아이가 목표에 떼어 두었다             (−)
WISH_RELEASE    목표를 지워 되돌렸다                  (+)
PLAN_SPEND      계획대로 쓴 것을 적었다               (−)
ADJUST          보호자가 잘못 적은 것을 고쳤다        (±)
```

### 🔴 `modules/allowance` 는 `modules/star-ledger` 를 **import 하지 않는다**

별↔현금 전환 경로 0건(P-21 · REQ-NF-010 · S4)이 규제 요건이고,
**그 사실이 import 목록에서 바로 보여야 한다.** 금지 심볼(`cash` · `withdraw` · `convert`)도
쓰지 않는다(REQ-TEC-008 정적 검사).

---

## 5. 그쪽에서 고칠 곳

1. `mock_balance_won` 읽는 곳을 **`getBalance(childId)`** 로 바꾼다
2. 충전을 **`topUp(childId, amount, memo, key)`** 로 바꾼다 — 컬럼 증가 대신 원장 한 줄
3. `guardian_accounts` 에서 `mock_balance_won` 을 뺀다 (`savings_interest_pct` · `mock_card_*` 는 **남긴다**)
4. `/parent/bank` 에 **기록 목록 + 「고치기」** 를 넣는다 (`getHistory` · `reverseEntryAction`)
5. `/parent/allowance` 를 지운다

### 되돌리기에서 놓치기 쉬운 것

**줄을 고치거나 지우지 않는다. 상쇄하는 줄을 새로 적는다.**

- 보호자가 적은 줄(`TOPUP` · `ADJUST`)만 되돌린다 — 아이 기록을 보호자가 임의로 지우면
  **아이는 자기 장부를 믿을 수 없게 된다**
- **되돌릴 수 있는 만큼만.** 20,000원을 잘못 줬는데 아이가 15,000원을 이미 넣었으면
  5,000원만 돌아온다. 그대로 상쇄하면 잔액이 마이너스가 되고 아이 화면이 거짓말을 시작한다
- **못 되돌린 만큼을 그대로 말한다.** 조용히 넘기면 보호자는 다 취소된 줄 안다
- 한 줄당 한 번 (`adjust:<줄id>`)

---

## 6. 이쪽이 그쪽 것을 받아 쓸 부분

| 그쪽 것 | 이쪽에서 쓸 곳 |
| --- | --- |
| **카드 발급 단계** (`REQUESTED → VERIFIED → SHIPPING → ACTIVE`) | 이쪽 카드 내역(D19)은 **카드가 이미 있다고 가정**하고 만들었다. 발급 절차가 앞에 와야 맞다 — 아이 화면이 「카드 오는 중」을 보여야 한다 |
| **이자율** (`savings_interest_pct`) | **「불리기」를 여는 열쇠다.** 이쪽은 「적금 가입~만기가 필요해 실천을 못 연다」고 판단했는데(D16), 부모가 직접 주는 이자는 **외부 상품이 아니라** P-20(가입 중개 금지)에 걸리지 않는다 |

---

## 7. 관련 어긋남 대장

`D18`(용돈 장부 · 규제선) · `D19`(카드 내역 예시) · `D16`(불리기 실천 잠금) —
`docs/ops-docs/[Ops]Spec-Drift-Log.md`
