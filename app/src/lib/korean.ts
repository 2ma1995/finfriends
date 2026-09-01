/**
 * 조사 붙이기 — 「학비**을** 중간에 깼어요」처럼 어긋나면 아이에게 어색하게 읽힌다.
 *
 * 🔴 목표 이름은 **아이가 직접 적는다.** 무엇이 들어올지 모르므로 코드가 골라야 한다.
 *    받침이 있으면 앞의 것, 없으면 뒤의 것을 쓴다.
 */
export function josa(word: string, withBatchim: string, withoutBatchim: string) {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  // 한글 음절이 아니면(숫자·영문·이모지) 판단할 수 없다 — 받침 없는 쪽으로 둔다
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return withoutBatchim;
  return (code - 0xac00) % 28 === 0 ? withoutBatchim : withBatchim;
}

export const eul = (w: string) => `${w}${josa(w, "을", "를")}`;
export const i = (w: string) => `${w}${josa(w, "이", "가")}`;
export const eun = (w: string) => `${w}${josa(w, "은", "는")}`;
