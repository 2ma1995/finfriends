// 🔴 카탈로그는 `@/contracts/items`, 보유·잔액은 DB(`@/modules/items`)가 준다.
// 여기 남은 것은 문구뿐이다.

export const notice = "별은 방 아이템으로만 바꿀 수 있어요. 돈으로 바꾸지는 않아요.";
export const savingHint = "지금 안 쓰고 모으면 더 큰 걸 바꿀 수 있어요.";

export const boughtNotice = (name: string) => `「${name}」를 샀어요. 방에 가면 있어요.`;
/** 🔴 「안 돼요」로 끝내지 않는다. 얼마가 모자란지 말한다 (ACE-1.1) */
export const shortNotice = (need: number) => `별이 ${need}개 더 있으면 살 수 있어요.`;
export const ownedLabel = "가진 것";
export const wearingLabel = "입는 중";
export const buyLabel = "바꾸기";
export const equipLabel = "입기";
export const unequipLabel = "벗기";
export const lockedHint = "별이 모자라요";

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };
