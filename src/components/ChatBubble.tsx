import React from 'react';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  characterName?: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ role, content, characterName }) => {
  const isUser = role === 'user';
  return (
    <div className={`flex mb-2 ${isUser ? 'justify-end' : 'justify-start'} animate-[fadeUp_0.2s_ease-out]`}>
      <div
        className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words
          ${isUser
            ? 'bg-purple-600 text-white rounded-br-sm'
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm shadow-sm'
          }`}
      >
        {!isUser && characterName && (
          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
            {characterName}
          </div>
        )}
        {content}
      </div>
    </div>
  );
};

export default ChatBubble;
