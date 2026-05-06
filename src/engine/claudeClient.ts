// Call backend API (for production) or direct API (for local development)
export const sendMessage = async (
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  // Check if we're in development with local API key
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const isLocalDev = apiKey && import.meta.env.MODE === 'development';

  if (isLocalDev) {
    // Direct API call for local development only
    return sendMessageDirect(systemPrompt, userMessage, conversationHistory);
  } else {
    // Backend API call for production
    return sendMessageViaBackend(systemPrompt, userMessage, conversationHistory);
  }
};

// Direct API call (local development only with .env.local)
const sendMessageDirect = async (
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const baseURL = import.meta.env.VITE_ANTHROPIC_BASE_URL;

  if (!apiKey) {
    throw new Error('VITE_ANTHROPIC_API_KEY is not set');
  }

  const url = `${baseURL || 'https://api.anthropic.com'}/v1/messages`;

  const messages = [
    ...conversationHistory,
    { role: 'user' as const, content: userMessage },
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `API Error: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  const data = await response.json();
  const content = data.content?.[0];

  if (content?.type === 'text') {
    return content.text;
  }

  throw new Error('Unexpected response format from Claude API');
};

// Backend API call (production deployment)
const sendMessageViaBackend = async (
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> => {
  const apiEndpoint = '/api/chat';

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemPrompt,
      userMessage,
      conversationHistory,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `API Error: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  const data = await response.json();

  if (data.text) {
    return data.text;
  }

  throw new Error('Unexpected response format from API');
};

