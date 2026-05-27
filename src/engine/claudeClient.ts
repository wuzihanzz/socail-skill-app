export const sendMessage = async (
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  const localKey = import.meta.env.VITE_DEEPSEEK_API_KEY;

  if (localKey && import.meta.env.MODE === 'development') {
    return sendMessageDeepSeekDirect(systemPrompt, userMessage, conversationHistory, localKey);
  }
  return sendMessageViaBackend(systemPrompt, userMessage, conversationHistory);
};

const sendMessageDeepSeekDirect = async (
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  apiKey: string
): Promise<string> => {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      max_tokens: 300,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`DeepSeek API Error: ${response.status} - ${JSON.stringify(error)}`);
  }

  const data = await response.json() as any;
  const content = data.choices?.[0]?.message?.content;
  if (content) return content;
  throw new Error('Unexpected response format from DeepSeek API');
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
