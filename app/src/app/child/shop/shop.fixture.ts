// PROTO-DATA: STR-005 · PRC-004 — 백엔드 완료 시 이 파일을 지우고 아이템 목록·구매 액션으로 대체한다

/**
 * 상점은 카탈로그를 그대로 읽는다 — 목록의 원천을 둘로 나누지 않는다.
 * 🔴 별은 **앱 안에서만** 쓴다. 현물·현금·제휴처 경로를 만들지 않는다 (P-21).
 */
export { CATALOG, CATEGORIES, byCategory, me, type Category, type Item } from "../home/room.fixture";

export const notice = "별은 방 아이템으로만 바꿀 수 있어요. 돈으로 바꾸지는 않아요.";
export const savingHint = "지금 안 쓰고 모으면 더 큰 걸 바꿀 수 있어요.";
