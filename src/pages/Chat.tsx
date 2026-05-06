import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import characters from '../data/characters';
import { useGameStore } from '../store/gameStore';
import PixelAvatar from '../components/PixelAvatar';
import TrustBar from '../components/TrustBar';
import ChatBubble from '../components/ChatBubble';
import { buildSystemPrompt } from '../engine/promptBuilder';
import { getUnlockedSkills, getHiddenSkills } from '../engine/skillEngine';
import { generateTodayEvent } from '../engine/eventGenerator';
import { calculateTrustDelta, isHarmfulMessage } from '../engine/trustEngine';
import { sendMessage } from '../engine/claudeClient';
import { generateConversationTips } from '../engine/conversationHelper';
import './Chat.css';

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentCharacterId,
    relationships,
    addMessage,
    updateTrustLevel,
    setTodayEventTriggered,
    markAskedAbout,
  } = useGameStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayEvent, setTodayEvent] = useState<string | null>(null);
  const [conversationTips, setConversationTips] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  if (!currentCharacterId) {
    return <div>Loading...</div>;
  }

  const character = characters.find((c) => c.id === currentCharacterId);
  const relationship = relationships[currentCharacterId];

  if (!character || !relationship) {
    return <div>Character not found</div>;
  }

  // Generate today's event on first load
  useEffect(() => {
    if (!relationship.todayEventTriggered && !todayEvent) {
      const event = generateTodayEvent(
        character,
        relationship.lastDailyEvent,
        relationship.todayEventTriggered
      );
      if (event) {
        setTodayEvent(event);
        setTodayEventTriggered(currentCharacterId, true);
      }
    }
  }, []);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  }, [relationship.conversationHistory, loading]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');

    // Add user message to state
    addMessage(currentCharacterId, {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    });

    // Check for harmful messages
    if (isHarmfulMessage(userMessage)) {
      addMessage(currentCharacterId, {
        role: 'assistant',
        content: '...我需要一些时间。也许我们改天再聊？',
        timestamp: Date.now(),
      });
      updateTrustLevel(currentCharacterId, -15, 'upset');
      return;
    }

    // Calculate trust delta
    const { trustDelta, emotionChange } = calculateTrustDelta(
      userMessage,
      '',
      !relationship.firstMessageSent
    );

    // Build system prompt
    const unlockedSkills = getUnlockedSkills(
      character,
      relationship.trustLevel,
      relationship.unlockedSkills
    );
    const hiddenSkills = getHiddenSkills(
      character,
      relationship.trustLevel,
      relationship.unlockedSkills
    );

    const systemPrompt = buildSystemPrompt(
      character,
      relationship.trustLevel + trustDelta,
      unlockedSkills,
      hiddenSkills,
      todayEvent,
      emotionChange
    );

    setLoading(true);

    try {
      const aiResponse = await sendMessage(
        systemPrompt,
        userMessage,
        relationship.conversationHistory.map((m) => ({
          role: m.role,
          content: m.content,
        }))
      );

      // Parse JSON response from LLM
      let message = '';
      let satisfactionDelta = 3; // Default: neutral (2-4 range)

      try {
        // Try to extract JSON from markdown code blocks if present
        let jsonStr = aiResponse;
        const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonStr);
        message = parsed.message || '';
        satisfactionDelta = parsed.satisfactionDelta || 3;
      } catch {
        // Fallback: treat as plain text if not valid JSON
        message = aiResponse;
        // Try to extract just the message portion if it looks like failed JSON
        const msgMatch = aiResponse.match(/"message"\s*:\s*"([^"]*?)"\s*[,}]/);
        if (msgMatch) {
          message = msgMatch[1];
        }
      }

      // Map satisfactionDelta (2-4 range) to trust delta (-3 to +3)
      const mappedLLMDelta = (satisfactionDelta - 3) * 3;

      // Weighted combination: trustEngine 40% + LLM delta 60%
      const finalTrustDelta = trustDelta * 0.4 + mappedLLMDelta * 0.6;

      // Adjust emotion based on satisfaction level
      let finalEmotion: 'neutral' | 'happy' | 'upset' = emotionChange;
      if (satisfactionDelta === 4) {
        finalEmotion = 'happy';
      } else if (satisfactionDelta === 2) {
        finalEmotion = 'upset';
      }

      // Detect what information was revealed in AI response
      const lowerResponse = message.toLowerCase();
      if (lowerResponse.includes(character.name)) {
        markAskedAbout(currentCharacterId, 'name');
      }
      if (lowerResponse.includes(character.mbti)) {
        markAskedAbout(currentCharacterId, 'mbti');
      }
      if (
        lowerResponse.includes(character.zodiac) ||
        lowerResponse.includes(character.zodiac.replace(/♊|♏|♍/g, ''))
      ) {
        markAskedAbout(currentCharacterId, 'zodiac');
      }
      if (lowerResponse.includes(character.age.toString())) {
        markAskedAbout(currentCharacterId, 'age');
      }
      if (lowerResponse.includes(character.job)) {
        markAskedAbout(currentCharacterId, 'job');
      }

      // Split response by \n\n to handle multiple short messages
      const messageChunks = message
        .split('\n\n')
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length > 0);

      // Add each message chunk separately with a small delay for natural feel
      messageChunks.forEach((chunk, index) => {
        setTimeout(() => {
          addMessage(currentCharacterId, {
            role: 'assistant',
            content: chunk,
            timestamp: Date.now(),
            trustDelta: index === 0 ? finalTrustDelta : 0, // Only apply trustDelta to first message
          });
        }, index * 300); // 300ms delay between each message
      });

      // Update trust level and clear loading state after all messages are added
      const totalDelay = messageChunks.length > 1 ? (messageChunks.length - 1) * 300 + 100 : 100;
      setTimeout(() => {
        updateTrustLevel(currentCharacterId, finalTrustDelta, finalEmotion);
        // Generate conversation tips based on the last message chunk
        const lastMessage = messageChunks[messageChunks.length - 1];
        const tips = generateConversationTips(lastMessage);
        setConversationTips(tips);
        setLoading(false);
      }, totalDelay);
    } catch (error) {
      console.error('Error sending message:', error);
      addMessage(currentCharacterId, {
        role: 'assistant',
        content: '抱歉，我遇到了一些问题。可以再试一次吗？',
        timestamp: Date.now(),
      });
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chat-page">
      <header className="chat-header">
        <button className="back-button" onClick={() => navigate('/characters')}>
          ← 返回
        </button>
        <div className="header-info">
          <h1>{character.nickname}</h1>
          <p>在线中</p>
        </div>
        <button className="profile-button" onClick={() => navigate('/profile')}>
          档案 📋
        </button>
      </header>

      <TrustBar
        trustLevel={relationship.trustLevel}
        satisfactionLevel={relationship.satisfactionLevel}
      />

      <div className="chat-container">
        <div className="avatar-container">
          <PixelAvatar
            characterId={character.id}
            emotion={relationship.currentEmotion}
            name={character.name}
          />
        </div>

        <div className="messages-container">
          {relationship.conversationHistory.length === 0 && (
            <div className="first-message-hint">
              <p>开始和{character.nickname}聊天吧！</p>
              <small>你的回答会影响他/她对你的看法。</small>
            </div>
          )}

          {relationship.conversationHistory.map((msg, idx) => (
            <ChatBubble
              key={idx}
              role={msg.role}
              content={msg.content}
              characterName={msg.role === 'assistant' ? character.nickname : undefined}
            />
          ))}

          {loading && (
            <div className="loading-indicator">
              <div className="spinner"></div>
              <p>{character.nickname}正在思考...</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`对${character.nickname}说...`}
            disabled={loading}
            rows={3}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="send-button"
          >
            {loading ? '...' : '发送'}
          </button>
        </div>

        {/* Conversation Tips */}
        {conversationTips.length > 0 && !loading && (
          <div className="conversation-tips">
            <div className="tips-label">💡 可以这样回复：</div>
            <div className="tips-list">
              {conversationTips.map((tip, idx) => (
                <span key={idx} className="tip-item">{tip}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
