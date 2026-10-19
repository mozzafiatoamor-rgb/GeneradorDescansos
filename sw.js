/* Service worker — Gestor de Descansos
   Estrategia: red primero para el shell (así siempre baja la última versión),
   con respaldo a caché cuando no hay internet. El tráfico de otros orígenes
   (Supabase, CDN del SDK, Google Fonts) pasa directo a la red sin tocar. */
var CACHE = 'descansos-v133';
var SHELL = [
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(e){
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(SHELL.map(function(u){
        return c.add(u).catch(function(){});
      }));
    })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        if(k !== CACHE){ return caches.delete(k); }
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  // Solo gestionamos nuestro propio origen; lo demás (Supabase, CDN, fuentes) va directo.
  if(url.origin !== self.location.origin) return;

  // Navegación o shell: red primero, caché de respaldo.
  e.respondWith(
    fetch(req).then(function(res){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(req, copy).catch(function(){}); });
      return res;
    }).catch(function(){
      return caches.match(req).then(function(hit){
        return hit || caches.match('./index.html');
      });
    })
  );
});
