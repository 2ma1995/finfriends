/**
 * 서비스 워커 — 웹 푸시 수신 전용. 어긋남 대장 D56.
 *
 * 🔴 **fetch 를 가로채지 않는다.** 캐싱을 하지 않는다 —
 *    이 앱은 잔액·미션 상태처럼 **낡으면 안 되는 숫자**를 보여준다.
 *    워커가 오래된 화면을 돌려주면 부모와 아이가 다른 잔액을 본다(D21 과 같은 사고).
 *    그래서 여기는 `push` · `notificationclick` 두 이벤트만 있다.
 *
 * 🔴 **스코프가 `/` 라 아이 화면도 범위에 든다.** 하지만 위 이유로 아무 것도 하지 않는다.
 *    아이 기기는 구독을 만들지 않으므로 `push` 가 올 일도 없다.
 *
 * 🔴 이 파일은 번들러를 거치지 않는다 — `public/` 이라 그대로 서빙된다.
 *    import 를 쓰지 않고 평범한 JS 로 둔다.
 */

self.addEventListener("install", () => {
  // 🔴 새 워커를 바로 쓴다. 안 하면 탭을 다 닫아야 갱신돼서
  //    「고쳤는데 그대로다」가 된다
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  // 🔴 본문이 깨져 있어도 알림은 띄운다. 조용히 사라지면 부모는 아무 것도 모른다
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "핀프렌즈";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "확인할 것이 있어요.",
      // 🔴 같은 tag 는 덮어쓴다. 미션 하나에 여러 번 알려도 한 줄만 남는다
      tag: data.tag || "finfriends",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // 🔴 진동·소리를 쓰지 않는다. 아이가 자는 시간에 갈 수 있다
      silent: false,
      data: { url: data.url || "/parent/alerts" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/parent/alerts";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // 🔴 이미 열려 있는 탭을 다시 쓴다. 매번 새 탭을 열면 탭이 쌓인다
      for (const client of all) {
        if (client.url.includes("/parent") && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
