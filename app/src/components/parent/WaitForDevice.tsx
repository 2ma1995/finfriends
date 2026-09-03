"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isChildDeviceRegistered } from "@/app/actions/invite-watch";

/**
 * 아이가 링크를 열면 다음 단계로 — 어긋남 대장 D76.
 *
 * 🔴 **부모는 이 화면에서 기다린다.** 링크를 넘겨주고 아이가 열기를 기다리는 중이다.
 *    등록이 끝나도 화면이 그대로면 **아무 일도 안 일어난 것처럼 보인다** —
 *    부모는 링크를 다시 만들거나 뒤로 나간다.
 *
 * 🔴 **묻는 것 말고 길이 없다.** 등록은 «아이 기기»에서 일어나므로
 *    이 화면은 그 사실을 알 수 없다.
 *
 * 🔴 **기다리는 동안만 묻는다.** 화면을 떠나면 멈추고, 탭이 뒤로 가 있으면 쉰다 —
 *    부모가 보고 있지도 않은데 계속 물어볼 이유가 없다.
 *
 * 🔴 **오래 묻지 않는다.** 5분이면 멈춘다. 부모가 화면을 켜 둔 채 자리를 비웠을 때
 *    밤새 물어보게 두지 않는다. 멈춘 뒤에는 새로고침하면 다시 시작한다.
 */
export function WaitForDevice({ waiting, done }: { waiting: string; done: string }) {
  const router = useRouter();
  const [found, setFound] = useState(false);
  const [tired, setTired] = useState(false);

  useEffect(() => {
    if (found) return;
    let alive = true;
    const startedAt = Date.now();
    const EVERY = 3000;
    const GIVE_UP = 5 * 60 * 1000;

    const ask = async () => {
      if (!alive || document.visibilityState !== "visible") return;
      if (Date.now() - startedAt > GIVE_UP) { setTired(true); return; }
      try {
        if (await isChildDeviceRegistered()) {
          if (!alive) return;
          setFound(true);
          /**
           * 🔴 **목록으로 보낸다.** 5단계 화면으로 곧장 보내지 않는다 —
           *    4단계에 ✓ 가 찍힌 것을 부모가 «보고» 넘어가야 한다.
           *    그게 「됐구나」를 말해 주는 유일한 자리다.
           */
          router.replace("/parent/onboarding?device=1");
          router.refresh();
        }
      } catch {
        // 세션이 끊겼거나 잠깐 실패한 것 — 다음 차례에 다시 묻는다
      }
    };

    const timer = setInterval(ask, EVERY);
    void ask();
    return () => { alive = false; clearInterval(timer); };
  }, [found, router]);

  if (tired) return null;
  return (
    <p className="mt-1.5 text-cap leading-relaxed text-ink-mute" aria-live="polite">
      {found ? done : waiting}
    </p>
  );
}
