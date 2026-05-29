export const sendMessage = async (
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  return sendMessageViaBackend(systemPrompt, userMessage, conversationHistory);
};

const sendMessageViaBackend = async (
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userMessage, conversationHistory }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  if (data.text) return data.text;
  throw new Error('Unexpected response format from API');
};
