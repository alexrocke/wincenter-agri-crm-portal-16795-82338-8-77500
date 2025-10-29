import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyD_86NF7TlXIUBcf6NFCUewncU9pew4jYg",
  authDomain: "wincenter-c31d6.firebaseapp.com",
  projectId: "wincenter-c31d6",
  storageBucket: "wincenter-c31d6.firebasestorage.app",
  messagingSenderId: "345471376201",
  appId: "1:345471376201:web:00e0c386a53a57cc491898",
  measurementId: "G-E4N1LTEZB9"
};

const VAPID_KEY = "BB2Tn5gcLU6F29MeeHj3OML26uS0WppK4zn1bmhSnMlBZXMo3LzHUfjM7kgZSSk-OOuaAXHODao2R51GjFTzHu8";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

let messaging: Messaging | null = null;

// Initialize messaging only in browser environment
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error('❌ Error initializing Firebase Messaging:', error);
  }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (!messaging) {
    console.warn('⚠️ Firebase Messaging not available');
    return null;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('❌ Notification permission denied');
      return null;
    }

    console.log('✅ Notification permission granted');

    // Get token
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    
    if (token) {
      console.log('🔑 FCM Token obtained:', token.substring(0, 20) + '...');
      return token;
    } else {
      console.warn('⚠️ No FCM token obtained');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting FCM token:', error);
    return null;
  }
}

/**
 * Setup listener for foreground messages
 */
export function onForegroundMessage(callback: (payload: any) => void) {
  if (!messaging) {
    console.warn('⚠️ Firebase Messaging not available');
    return () => {};
  }

  return onMessage(messaging, (payload) => {
    console.log('📨 Foreground message received:', payload);
    callback(payload);
  });
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (!isNotificationSupported()) {
    return null;
  }
  return Notification.permission;
}
