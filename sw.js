const CACHE_NAME = 'ebbinghaus-app-v1';
const ASSETS = [
'./',
'./index.html',
'./style.css',
'./app.js',
'./manifest.json'
];

self.addEventListener('install', (e) => {
e.waitUntil(
caches.open(CACHE_NAME).then((cache) => {
return cache.addAll(ASSETS);
})
);
});

self.addEventListener('fetch', (e) => {
e.respondWith(
caches.match(e.request).then((response) => {
return response || fetch(e.request);
})
);
});

// 通知をタップしたときにアプリを開く処理
self.addEventListener('notificationclick', (e) => {
e.notification.close();
e.waitUntil(
clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
for (const client of clientList) {
if (client.url.includes('index.html') || client.url === '/' || client.url.endsWith('/')) {
return client.focus();
}
}
if (clients.openWindow) return clients.openWindow('./');
})
);
});
