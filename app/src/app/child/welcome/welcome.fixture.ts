// PROTO-DATA: D13 — 문구만 있다. 진행 상태는 DB(`@/modules/onboarding`)가 가진다.
import { TOUR_STEPS, type TourStep } from "@/contracts/onboarding";

/**
 * 아이에게 하는 설명. 🔴 **초등 저학년이 읽는다** — 한 줄을 짧게, 한 장에 하나만 말한다.
 * 🔴 「나무」는 말하지 않는다. 성장 나무는 보호자 것이다 (어긋남 대장 D12).
 */
export const tour: readonly TourStep[] = [
  {
    emoji: "👋",
    title: "안녕! 여기는 네 방이야",
    lines: ["돈이랑 친해지는 곳이야.", "잠깐만 구경하고 시작하자."],
  },
  {
    emoji: "⭐",
    title: "별을 모아",
    lines: ["배우고, 해보고, 적으면 별이 생겨.", "별은 없어지지 않아."],
    live: "stars",
    peek: { href: "/child/stars", label: "내 별 보기" },
  },
  {
    emoji: "🛋️",
    title: "별로 방을 꾸며",
    lines: ["상점에서 옷·펫·가구를 별로 바꿔.", "산 건 네 방에 직접 놓을 수 있어."],
    peek: { href: "/child/shop", label: "상점 보기" },
  },
  {
    emoji: "🎯",
    title: "미션을 하고 「했어요」를 눌러",
    // 🔴 이 화면의 존재 이유. 누르자마자 별이 안 온다는 걸 **미리** 말해 둔다.
    //    모르고 누르면 아이는 「했는데 왜 별이 없지」로 끝난다 (AC-6.2)
    lines: [
      "부모님이 미션을 만들어 주셔.",
      "다 하면 「했어요」를 눌러.",
      "★ 별은 바로 안 붙어. 부모님이 확인하면 붙어.",
    ],
    live: "missions",
    peek: { href: "/child/missions", label: "미션 보기" },
  },
  {
    emoji: "📚",
    title: "배우고 진짜로 해봐",
    lines: ["짧게 읽고 퀴즈를 풀어.", "근데 퀴즈만 풀면 안 돼.", "배운 걸 한 번 해봐야 진짜야."],
    peek: { href: "/child/learn", label: "배우기 보기" },
  },
  {
    emoji: "📝",
    title: "쓸 곳을 미리 나눠 둬",
    lines: ["간식·문구처럼 쓸 곳을 정해서 봉투에 나눠 담아.", "카드로 쓰면 그 봉투에서 저절로 빠져.", "봉투 안에서 쓰면 별이 생겨."],
    peek: { href: "/child/allowance", label: "내 통장 보기" },
  },
  {
    emoji: "🎁",
    title: "갖고 싶은 걸 정해",
    lines: ["갖고 싶은 걸 적어 두면", "얼마나 모았는지 보여줄게.", "이제 시작해 볼까?"],
    peek: { href: "/child/wishlist", label: "갖고 싶은 것 보기" },
  },
];

// 🔴 문구와 로직이 다른 숫자를 믿으면 마지막 장에서 「끝」이 안 된다. 여기서 잡는다
if (tour.length !== TOUR_STEPS) {
  throw new Error(`온보딩 장 수가 안 맞는다: 문구 ${tour.length} · 계약 ${TOUR_STEPS}`);
}

export const nextLabel = "다음";
export const prevLabel = "이전";
export const skipLabel = "건너뛰기";
export const startLabel = "시작하기";
export const restartLabel = "사용법 다시 보기";

/** 끝냈을 때 — 별 1개 (ONBOARDING_LEARN) */
export const finishBonus = "다 봤어! 별 1개 선물이야 ⭐";

export const live = {
  stars: (n: number) => (n > 0 ? `지금 네 별은 ${n}개야.` : "아직 별이 하나도 없어. 지금부터 모으자."),
  missions: (n: number) =>
    n > 0 ? `지금 할 수 있는 미션이 ${n}개 있어.` : "지금은 미션이 없어. 생기면 알려줄게.",
};

export const noDevice = { title: "아직 준비가 안 됐어요", body: "부모님이 이 기기를 등록해 주셔야 열려요" };
export const consentRequired = { title: "보호자 동의가 필요해요", body: "부모님께 알려 주세요" };
