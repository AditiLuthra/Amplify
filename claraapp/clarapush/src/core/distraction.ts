export class DistractionDetector {
  private defaultUrls = [
    'twitter.com',
    'x.com',
    'tiktok.com',
    'instagram.com',
    'facebook.com',
    'reddit.com',
    'youtube.com',
    'pinterest.com',
    'snapchat.com',
    'twitch.tv',
    'linkedin.com',
    'whatsapp.com',
    'discord.com',
    'telegram.org',
  ];

  /**
   * Check if a URL matches known distraction patterns
   */
  isDistraction(url: string, customUrls: string[] = []): boolean {
    const allUrls = [...this.defaultUrls, ...customUrls];
    const urlLower = url.toLowerCase();

    return allUrls.some(pattern => {
      const patternLower = pattern.toLowerCase();
      return (
        urlLower.includes(patternLower) ||
        urlLower.includes(patternLower.replace('www.', ''))
      );
    });
  }

  /**
   * Get a supportive message for distraction redirection
   */
  getRedirectionMessage(urlDetected: string, taskTitle: string): string {
    const appName = this.extractAppName(urlDetected);

    const messages = [
      `I see you're heading to ${appName}. That's a common impulse! Let's pause for a moment. Your task is: "${taskTitle}". You've got this—just 20 more minutes of focus, and then you can take a proper break.`,
      `Noticed you're reaching for ${appName}. I get it—we all need breaks! But let's keep the momentum going on "${taskTitle}". How about we take a structured break after you make some progress?`,
      `${appName} is calling, I know. But you're in the middle of "${taskTitle}". Let's stay focused just a bit longer. You'll feel so much better finishing this!`,
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Suggest a healthy break alternative
   */
  getSuggestedBreak(): string {
    const breaks = [
      'Take a 2-minute stretch. Stand up, reach your arms above your head, and breathe deeply.',
      'Drink a glass of water and splash some water on your face. Refresh yourself!',
      'Step outside for 1-2 minutes. Fresh air and natural light work wonders.',
      'Do 10 jumping jacks or a quick walk around your room. Get your blood flowing.',
      'Close your eyes and do some box breathing: 4 seconds in, 4 seconds hold, 4 seconds out, 4 seconds pause.',
    ];

    return breaks[Math.floor(Math.random() * breaks.length)];
  }

  private extractAppName(url: string): string {
    const urlLower = url.toLowerCase();
    const mapping: { [key: string]: string } = {
      'twitter.com': 'Twitter',
      'x.com': 'X',
      'tiktok.com': 'TikTok',
      'instagram.com': 'Instagram',
      'facebook.com': 'Facebook',
      'reddit.com': 'Reddit',
      'youtube.com': 'YouTube',
      'pinterest.com': 'Pinterest',
      'snapchat.com': 'Snapchat',
      'twitch.tv': 'Twitch',
      'linkedin.com': 'LinkedIn',
      'discord.com': 'Discord',
      'telegram.org': 'Telegram',
    };

    for (const [pattern, name] of Object.entries(mapping)) {
      if (urlLower.includes(pattern)) {
        return name;
      }
    }

    return 'that website';
  }
}
