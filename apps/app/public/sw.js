// Ecbot service worker: makes the app installable and shows Web Push
// notifications. It caches nothing, so every page and API call still goes to
// the network and a deploy is live on the next load.

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Payload from the API (NotificationPushService): { id, title, body, url }.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    (async () => {
      // Open tabs refresh the bell now instead of on their next poll.
      const tabs = await self.clients.matchAll({ type: "window" });
      for (const tab of tabs) tab.postMessage({ type: "notification" });

      await self.registration.showNotification(data.title || "Ecbot", {
        body: data.body || "",
        icon: "/favicon/web-app-manifest-192x192.png",
        badge: "/favicon/favicon-96x96.png",
        tag: data.id,
        data: { url: data.url || "/" },
      });
    })(),
  );
});

// Opens the notification's page, in an Ecbot tab when one is open.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  );
  // Only ever open our own pages.
  const url =
    target.origin === self.location.origin ? target.href : self.location.origin;

  event.waitUntil(
    (async () => {
      const tabs = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const tab = tabs.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (tab) {
        await tab.focus();
        await tab.navigate(url).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
