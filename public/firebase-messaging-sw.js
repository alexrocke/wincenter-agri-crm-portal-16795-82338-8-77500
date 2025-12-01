// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyD_86NF7TlXIUBcf6NFCUewncU9pew4jYg",
  authDomain: "wincenter-c31d6.firebaseapp.com",
  projectId: "wincenter-c31d6",
  storageBucket: "wincenter-c31d6.firebasestorage.app",
  messagingSenderId: "345471376201",
  appId: "1:345471376201:web:00e0c386a53a57cc491898",
  measurementId: "G-E4N1LTEZB9"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('📨 Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'Nova Notificação';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [100, 50, 100], // Padrão de vibração
    data: payload.data || {},
    requireInteraction: false, // Não exigir interação
    tag: payload.data?.category || 'default', // Agrupar por categoria
    renotify: true, // Vibrar/notificar mesmo se já existe
    actions: [
      {
        action: 'view',
        title: '👁️ Ver',
        icon: '/logo.png'
      },
      {
        action: 'dismiss',
        title: '✖️ Dispensar',
        icon: '/logo.png'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event.notification);
  console.log('🔔 Action:', event.action);
  
  event.notification.close();

  // Handle action buttons
  if (event.action === 'dismiss') {
    console.log('❌ User dismissed notification');
    return;
  }

  // Determinar URL baseada nos dados da notificação
  const notificationData = event.notification.data || {};
  let targetUrl = '/';

  // Mapear categoria para rota apropriada
  if (notificationData.category) {
    const categoryRoutes = {
      'demo_assigned': '/seller/demonstrations',
      'demo_reminder': '/seller/demonstrations',
      'visit_late_30': '/seller/visits',
      'visit_late_60': '/seller/visits',
      'sale_pending': '/seller/sales',
      'opportunity_pending': '/seller/opportunities',
      'commission_payment': '/seller/commissions',
      'low_stock': '/admin/products',
      'goal_risk': '/seller/dashboard',
    };
    
    targetUrl = categoryRoutes[notificationData.category] || '/notifications';
  }

  console.log('🎯 Opening URL:', targetUrl);

  // Open app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se a app já está aberta, focar e navegar
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => {
            // Tentar navegar para a rota correta
            if ('navigate' in client) {
              return client.navigate(targetUrl);
            }
            // Se não conseguir navegar, enviar mensagem
            return client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: targetUrl,
              data: notificationData
            });
          });
        }
      }
      // Caso contrário, abrir nova janela na rota correta
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
