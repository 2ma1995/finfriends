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

  // 하단 탭이 들어온 뒤로는 여기서 자리를 많이 차지하면 안 된다 —
  // 자주 누르는 것이 아니고, 탭과 경쟁하면 안 된다 (D14)
  return (
    <div className="mt-4 px-gap pb-4 text-center">
      <form action={signOutAction}>
        <button type="submit" className="text-[0.78em] text-ink-mute underline underline-offset-2">
          로그아웃
        </button>
      </form>
      <p className="mt-1 text-[0.72em] leading-relaxed text-ink-mute">
        등록한 아이 기기는 로그아웃해도 그대로 열립니다.
      </p>
    </div>
  );
}
