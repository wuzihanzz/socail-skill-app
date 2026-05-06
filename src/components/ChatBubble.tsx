import React from 'react';
import './ChatBubble.css';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  characterName?: string;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({
  role,
  content,
  characterName,
}) => {
  return (
    <div className={`chat-bubble-wrapper ${role}`}>
      <div className="chat-bubble">
        {role === 'assistant' && characterName && (
          <div className="character-name">{characterName}</div>
        )}
        <div className="message-text">{content}</div>
      </div>
    </div>
  );
};

export default ChatBubble;
