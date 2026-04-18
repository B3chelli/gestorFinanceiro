self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', () => {
  // O Chrome exige que exista um evento 'fetch' para considerar o site um PWA instalável.
  // Como seus dados vivem no localStorage do celular, não precisamos fazer cache complexo de rede aqui!
});