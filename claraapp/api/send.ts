import webpush from 'web-push';

/**
 * Sends a Web Push notification. Called by Upstash QStash at the scheduled time.
 *
 * Requires env var: VAPID_PRIVATE_KEY
 * (The matching public key is shipped in the client and hard-coded below.)
 */

const VAPID_PUBLIC_KEY =
  'BDTvgf14tEfW-a2qYk-z3j9QpTF3wsrF4park7FdH9JsZq3qRQBNkyiHPH0tzZJwN2kKzkMBnuuovsm1S1YEFCM';
const VAPID_SUBJECT = 'mailto:aditi.luthra95@gmail.com';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) {
    res.status(500).json({ error: 'VAPID_PRIVATE_KEY missing' });
    return;
  }

  const { subscription, title, body } = req.body || {};
  if (!subscription) {
    res.status(400).json({ error: 'subscription required' });
    return;
  }

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, privateKey);
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: title || 'Clara',
        body: body || 'Time for your plan 💪',
        url: '/',
      })
    );
    res.status(200).json({ ok: true });
  } catch (err: any) {
    // 410/404 = subscription expired; surface for logs
    res.status(500).json({ error: err?.message || 'send failed', statusCode: err?.statusCode });
  }
}
