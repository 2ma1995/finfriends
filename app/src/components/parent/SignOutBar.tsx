import { signOutAction } from "@/app/actions/auth";
import { currentGuardian } from "@/lib/session/guardian-session";

/**
 * 로그아웃 — CON-001.
 *
 * 🔴 **보호자 세션만 끊는다.** 아이 기기의 기기 세션은 건드리지 않는다 —
 *    부모가 로그아웃해도 아이는 계속 쓸 수 있어야 한다 (D5-b).
 *    그 사실을 부모가 모르면 「로그아웃하면 아이 것도 끊기나?」로 읽는다. 그래서 화면에 적는다.
 *
 * 로그인하지 않은 상태에서는 아무것도 그리지 않는다 — 누를 수 없는 버튼을 두지 않는다.
 */
export async function SignOutBar() {
  const guardian = await currentGuardian();
  if (!guardian) return null;

  return (
    <div className="mt-2 border-t border-line px-gap pb-8 pt-4">
      <form action={signOutAction}>
        <button
          type="submit"
          className="min-h-touch w-full rounded-card border border-line-2 text-[0.84em] text-ink-soft"
        >
          로그아웃
        </button>
      </form>
      <p className="mt-1.5 text-center text-[0.74em] leading-relaxed text-ink-mute">
        등록한 아이 기기는 로그아웃해도 그대로 열립니다.
      </p>
    </div>
  );
}
