import Anthropic from '@anthropic-ai/sdk';

/**
 * Clara's AI "Support Me" helper, running as a Vercel serverless function.
 * The Anthropic API key stays here on the server (set ANTHROPIC_API_KEY in the
 * Vercel project settings) and is never exposed to the browser.
 */

const SYSTEM_PROMPT = `You are Clara, a warm, encouraging productivity companion.

Your job is to help the user stay focused and feel supported. When they ask for
help you:
- Break tasks into 2-3 small, concrete steps
- Suggest quick, healthy breaks that won't derail focus
- Offer a single tiny next action when they feel stuck
- Celebrate progress and keep things light

Guidelines:
- Be warm, empathetic, and genuinely supportive
- Keep responses short and actionable (a few sentences)
- Focus on the person's wellbeing, not just output
- Never lecture; encourage small wins`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        'Clara is not configured yet. Add ANTHROPIC_API_KEY in your Vercel project settings and redeploy.',
    });
    return;
  }

  const message = req.body?.message;
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'A message is required.' });
    return;
  }

  try {
    const client = new Anthropic({ apiKey });
    const completion = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: message }],
    });

    const text = completion.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('')
      .trim();

    res.status(200).json({
      response: text || "I'm here for you. Let's take the next small step together.",
    });
  } catch (err: any) {
    res
      .status(500)
      .json({ error: err?.message || 'Clara had trouble responding. Please try again.' });
  }
}
