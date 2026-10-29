// 오프라인에서도 앱 화면이 열리도록 파일을 기기에 저장해두는 스크립트
// 인터넷이 되면 항상 최신 파일을 먼저 받고, 안 되면 저장해둔 걸 씀
const CACHE = "planner-app-v1";
const CORE = ["./", "./index.html", "./icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).hostname.endsWith("supabase.co")) return; // 데이터는 저장하지 않음 (앱이 따로 관리)

  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })
      .catch(async () => {
        const hit = await caches.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === "navigate") return (await caches.match("./index.html")) || Response.error();
        return Response.error();
      })
  );
});
