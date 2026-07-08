/**
 * Client-side Web Push helpers.
 *
 * The user taps "Enable reminders" -> we ask permission and create a push
 * subscription (stored locally + used by the server to reach this device).
 * When a task has a planned time, we ask the server to schedule a push for
 * that exact moment (via /api/schedule -> QStash -> /api/send).
 */

// Public VAPID key (safe to ship in the client). Matches VAPID_PRIVATE_KEY on the server.
const VAPID_PUBLIC_KEY =
  'BDTvgf14tEfW-a2qYk-z3j9QpTF3wsrF4park7FdH9JsZq3qRQBNkyiHPH0tzZJwN2kKzkMBnuuovsm1S1YEFCM';

const SUB_KEY = 'claraPushSub';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function isPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function isPushEnabled(): boolean {
  return (
    isPushSupported() &&
    Notification.permission === 'granted' &&
    !!localStorage.getItem(SUB_KEY)
  );
}

export function getStoredSubscription(): unknown | null {
  const raw = localStorage.getItem(SUB_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function enablePush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  localStorage.setItem(SUB_KEY, JSON.stringify(sub));
  return true;
}

/** Ask the server to deliver a push at a specific time. Best-effort. */
export async function scheduleReminder(opts: {
  title: string;
  body: string;
  sendAt: string; // ISO datetime
}): Promise<boolean> {
  const subscription = getStoredSubscription();
  if (!subscription) return false;
  try {
    const res = await fetch('/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription, ...opts }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
