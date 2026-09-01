/**
 * 아동 모드 잠금 해제 문구 — `D5` · 어긋남 대장 D41.
 *
 * 🔴 **아이도 이 화면을 본다.** 아이가 눌러 보다 여기 닿을 수 있으므로
 *    「너는 못 들어와」가 아니라 **「어른이 쓰는 자리」**로 말한다.
 */

export const title = "부모님 확인";
export const lead = "이 기기는 아이 화면으로 맞춰져 있어요. 부모님이 잠깐 보시려면 PIN 을 넣어 주세요.";

export const pinLabel = "네 자리 숫자";
export const submitLabel = "열기";
export const backLabel = "아이 화면으로";

/** 🔴 **잠깐만 열린다는 것을 미리 말한다.** 열어 두고 자리를 뜨는 일을 줄인다 */
export const graceNotice = "10분 뒤에 다시 잠깁니다. 다 보시면 「아이 화면으로」를 눌러 주세요.";

export const errors: Record<string, string> = {
  WRONG: "PIN 이 맞지 않아요.",
  LOCKED: "여러 번 틀려서 잠겼어요. 로그인으로 들어가 주세요.",
  /** 🔴 PIN 을 안 정한 집 — 없는 것을 있는 척하지 않는다 */
  NO_PIN: "아직 PIN 을 정하지 않으셨어요. 부모님 기기에서 로그인한 뒤 「내 정보」에서 정할 수 있어요.",
  NO_DEVICE: "이 기기는 등록된 아이 기기가 아니에요.",
};

/** 🔴 남은 횟수를 말한다. 안 말하면 갑자기 잠긴 것으로 보인다 */
export const triesLeft = (n: number) => `${n}번 더 틀리면 잠깁니다.`;

/** 잠긴 뒤에는 비밀번호로만 푼다 — PIN 은 네 자리라 무차별 대입이 쉽다 */
export const lockedHelp = "PIN 은 네 자리라 여러 번 틀리면 잠급니다. 로그인하시면 다시 쓸 수 있어요.";
