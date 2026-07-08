import { Client } from '@upstash/qstash';

/**
 * Schedules a push notification for a future time using Upstash QStash.
 * QStash calls /api/send at the requested moment, so no always-on server or
 * frequent cron is needed (works on Vercel's free plan).
 *
 * Requires env var: QSTASH_TOKEN
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const token = process.env.QSTASH_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'Reminders not configured yet (QSTASH_TOKEN missing).' });
    return;
  }

  const { subscription, title, body, sendAt } = req.body || {};
  if (!subscription || !sendAt) {
    res.status(400).json({ error: 'subscription and sendAt are required' });
    return;
  }

  const when = new Date(sendAt).getTime();
  if (isNaN(when)) {
    res.status(400).json({ error: 'invalid sendAt' });
    return;
  }
  const delaySeconds = Math.max(0, Math.floor((when - Date.now()) / 1000));

  // Build the absolute URL QStash should call back.
  const proto = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
  const target = `${proto}://${host}/api/send`;

  try {
    const qstash = new Client({ token });
    await qstash.publishJSON({
      url: target,
      body: { subscription, title, body },
      delay: delaySeconds,
    });
    res.status(200).json({ ok: true, delaySeconds });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to schedule reminder' });
  }
}
