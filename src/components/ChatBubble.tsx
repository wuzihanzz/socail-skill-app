import React from 'react';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  characterName?: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ role, content, characterName }) => {
  const isUser = role === 'user';

  return (
    <div className={`mb-3 flex ${isUser ? 'justify-end' : 'justify-start'} animate-[fadeUp_0.2s_ease-out]`}>
      <div
        className={`max-w-[76%] rounded-[8px] px-3.5 py-2.5 text-sm leading-6 whitespace-pre-wrap break-words
          ${isUser
            ? 'bg-gray-950 text-white shadow-sm'
            : 'border border-gray-200 bg-white text-gray-800 shadow-sm'
          }`}
      >
        {!isUser && characterName && (
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {characterName}
          </div>
        )}
        {content}
      </div>
    </div>
  );
};

export default ChatBubble;
