import React from 'react';
import { sanitizeAssistantMessage } from '../engine/assistantOutput';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  characterName?: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ role, content, characterName }) => {
  const isUser = role === 'user';
  const visibleContent = isUser ? content : sanitizeAssistantMessage(content);
  if (!visibleContent) return null;

  return (
    <div className={`mb-3 flex ${isUser ? 'justify-end' : 'justify-start'} animate-[fadeUp_0.2s_ease-out]`}>
      <div
        className={`max-w-[76%] rounded-[8px] px-3.5 py-2.5 text-sm leading-6 whitespace-pre-wrap break-words
          ${isUser
            ? 'bg-[#1f3128] text-white shadow-sm'
            : 'border border-[#d9e4dc] bg-white text-[#1f3128] shadow-sm'
          }`}
      >
        {!isUser && characterName && (
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#66756b]">
            {characterName}
          </div>
        )}
        {visibleContent}
      </div>
    </div>
  );
};

export default ChatBubble;
