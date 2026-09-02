"use client";

import { useState } from "react";
import { createInviteLinkAction } from "@/app/actions/device";

/**
 * 초대 링크 — 🔴 **아이 폰에 부모 비밀번호를 안 치게 한다** (어긋남 대장 D63).
 *
 * 기존 「기기 등록」은 **누른 브라우저**를 아이 기기로 바꾼다. 아이 폰에 넘기려면
 * 그 폰에서 부모로 로그인해야 했다 — 아이 앞에서 부모 비밀번호를 치는 흐름이다.
 *
 * 🔴 **길은 하나다.** 이 링크도 `/child/enter` 로 들어간다 — 「기기 등록」 버튼과
 *    **같은 코드를 같은 방식으로** 소진한다. 길이 둘이면 한쪽만 고쳐진다 (`D24`).
 *
 * 🔴 **한 번 누르면 코드가 하나 생긴다.** 여러 번 누르면 앞의 것은 죽지 않고 남는다 —
 *    24시간이면 스스로 만료되지만, 그렇다고 마구 만들 이유는 없다. 그래서 한 번
 *    만들면 버튼을 「다시 만들기」로 바꿔 **누르고 있다는 것을 알게** 한다.
 */
export function InviteLink({
  make, remake, hint, copyLabel, copied, failed,
}: {
  make: string; remake: string; hint: string;
  copyLabel: string; copied: string; failed: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(false);

  async function create() {
    setBusy(true); setErr(false); setDone(false);
    const r = await createInviteLinkAction();
    setBusy(false);
    if (r.ok) setUrl(r.url); else setErr(true);
  }

  async function copy() {
    if (!url) return;
    try {
      // 🔴 `navigator.clipboard` 는 https 나 localhost 에서만 된다.
      //    안 되면 조용히 실패하지 않고 **직접 고르라고** 말한다
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch { setErr(true); }
  }

  return (
    <section className="mt-2.5">
      <button type="button" onClick={create} disabled={busy}
              className="min-h-touch w-full rounded-card border border-primary bg-surface text-sub font-bold text-primary-d disabled:cursor-not-allowed disabled:border-line-2 disabled:font-normal disabled:text-ink-mute">
        {url ? remake : make}
      </button>
      <p className="mt-1 text-cap leading-relaxed text-ink-mute">{hint}</p>

      {url ? (
        <div className="mt-1.5 rounded-card bg-sand px-3 py-2.5">
          {/* 🔴 **주소를 그대로 보여준다.** 아이 폰에서 직접 칠 수도 있어야 한다 */}
          <p className="break-all text-cap leading-relaxed text-ink-soft">{url}</p>
          <button type="button" onClick={copy}
                  className="mt-1.5 min-h-touch w-full rounded-card bg-primary text-sub font-bold text-white">
            {done ? copied : copyLabel}
          </button>
        </div>
      ) : null}

      {err ? <p className="mt-1.5 text-cap text-miss">{failed}</p> : null}
    </section>
  );
}
