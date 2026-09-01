"use client";

import { useCallback, useEffect, useState } from "react";
import { removePushAction, savePushAction } from "@/app/actions/push";

/**
 * 폰 알림 켜기 — 어긋남 대장 D56.
 *
 * 🔴 **브라우저가 허락을 물어야 하므로 클라이언트다.** `Notification.requestPermission`
 *    은 **사용자 제스처 안에서만** 통한다 — 화면 열자마자 부르면 브라우저가 무시하거나
 *    영구 거부로 기록한다. 그래서 버튼을 누를 때만 부른다.
 *
 * 🔴 **거부는 되돌릴 수 없다.** 한 번 「차단」을 누르면 이 코드로는 다시 물을 수 없고
 *    부모가 브라우저 설정에서 직접 풀어야 한다. 그래서 버튼 문구에
 *    무엇을 받게 되는지 먼저 적는다 — 모르고 누르고 차단하면 끝이다.
 *
 * 🔴 **아이 화면에는 이 컴포넌트를 두지 않는다.** 아이 기기에 푸시를 보내지 않는다.
 */

type State = "checking" | "unsupported" | "off" | "on" | "blocked" | "working";

const LABEL: Record<State, string> = {
  checking: "확인하는 중…",
  unsupported: "이 브라우저는 폰 알림을 지원하지 않아요",
  off: "폰으로 알림 받기",
  on: "이 기기에서 알림 받는 중",
  blocked: "브라우저에서 알림이 차단돼 있어요",
  working: "잠시만요…",
};

export function PushOptIn({ publicKey, deviceCount }: { publicKey: string; deviceCount: number }) {
  const [state, setState] = useState<State>("checking");
  const [note, setNote] = useState<string | null>(null);

  /** 이 기기가 이미 구독했는지 본다 — 서버의 기기 수와 별개다 (다른 기기일 수 있다) */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (typeof window === "undefined") return;
      // 🔴 셋 중 하나만 없어도 웹 푸시가 성립하지 않는다.
      //    iOS 사파리는 **홈 화면에 추가한 뒤에만** 지원한다 — 그래서 안내를 따로 적는다
      const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!ok || publicKey.length === 0) { if (alive) setState("unsupported"); return; }
      if (Notification.permission === "denied") { if (alive) setState("blocked"); return; }
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const sub = await reg?.pushManager.getSubscription();
        if (alive) setState(sub ? "on" : "off");
      } catch {
        if (alive) setState("off");
      }
    })();
    return () => { alive = false; };
  }, [publicKey]);

  const turnOn = useCallback(async () => {
    setState("working"); setNote(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "blocked" : "off");
        return;
      }
      // 🔴 등록이 **활성**될 때까지 기다린다. `register` 직후에는 아직 못 쓴다
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const sub = await (reg.pushManager.getSubscription()).then((s) => s ?? reg.pushManager.subscribe({
        // 🔴 `true` 여야 한다. 웹 푸시는 **본문 있는 알림만** 허용한다 —
        //    조용한 푸시(백그라운드 추적)를 막기 위한 규격 제약이다
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

      const r = await savePushAction(JSON.stringify(sub));
      if (!r.ok) { setState("off"); setNote("등록이 안 됐어요. 잠시 뒤 다시 눌러 주세요."); return; }
      setState("on");
    } catch {
      setState("off");
      setNote("등록이 안 됐어요. 잠시 뒤 다시 눌러 주세요.");
    }
  }, [publicKey]);

  const turnOff = useCallback(async () => {
    setState("working"); setNote(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        // 🔴 브라우저 쪽과 서버 쪽을 **둘 다** 지운다. 하나만 지우면
        //    서버는 계속 보내고 브라우저는 안 뜨거나(유령 구독),
        //    브라우저는 받을 준비인데 서버에 대상이 없다
        await removePushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
      setNote("해제가 안 됐어요. 잠시 뒤 다시 눌러 주세요.");
    }
  }, []);

  const busy = state === "checking" || state === "working";

  return (
    <div>
      {state === "on" ? (
        <button
          type="button" onClick={turnOff} disabled={busy}
          className="min-h-touch w-full rounded-card border border-line text-[0.82em] text-ink-soft disabled:opacity-50"
        >
          이 기기 알림 끄기
        </button>
      ) : (
        <button
          type="button" onClick={turnOn}
          disabled={busy || state === "unsupported" || state === "blocked"}
          className="min-h-touch w-full rounded-card bg-primary text-[0.86em] text-white disabled:bg-line-2 disabled:text-ink-mute"
        >
          {LABEL[state]}
        </button>
      )}

      <p className="mt-1.5 text-[0.74em] leading-relaxed text-ink-mute">
        {state === "on"
          ? `아이가 미션을 끝내면 이 기기 잠금화면에 뜹니다.${deviceCount > 1 ? ` 지금 ${deviceCount}개 기기가 받고 있어요.` : ""}`
          : state === "blocked"
            ? "브라우저 주소창의 자물쇠 → 알림 → 허용으로 바꾸면 다시 켤 수 있어요."
            : state === "unsupported"
              ? "아이폰은 이 화면을 홈 화면에 추가한 뒤에 켤 수 있어요."
              : "아이가 미션을 끝냈을 때와 24시간 동안 확인하지 않았을 때만 보냅니다. 광고는 보내지 않아요."}
      </p>
      {note ? <p className="mt-1 text-[0.74em] text-miss">{note}</p> : null}
    </div>
  );
}

/**
 * VAPID 공개 키를 브라우저가 원하는 형태로 바꾼다.
 *
 * 🔴 base64**url** 이다 — `-` `_` 를 `+` `/` 로 되돌리고 `=` 를 채워야 `atob` 가 받는다.
 *    이걸 빠뜨리면 `subscribe` 가 조용히 실패한다.
 */
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url.padEnd(base64Url.length + ((4 - (base64Url.length % 4)) % 4), "=");
  const raw = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  // 🔴 `ArrayBuffer` 를 먼저 만든다. `new Uint8Array(길이)` 는 `ArrayBufferLike` 로 잡혀
  //    `applicationServerKey` 가 받지 않는다 (SharedArrayBuffer 가능성 때문)
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}
