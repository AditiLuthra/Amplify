import { useState, useCallback } from 'react';
import { claraClient } from '../../api/client.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ toolId: string; result?: any; error?: string }>;
}

export function useAgent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    setLoading(true);
    setError(null);

    // Add user message to history
    setMessages(prev => [...prev, { role: 'user', content: message }]);

    try {
      const response = await claraClient.chat(message);

      // Add assistant response
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: response.response,
          toolCalls: response.toolCalls,
        },
      ]);

      return response;
    } catch (err) {
      const errorMsg = (err as any).message;
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearHistory,
  };
}
