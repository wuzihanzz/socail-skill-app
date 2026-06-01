import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import characters from '../data/characters';
import { useGameStore } from '../store/gameStore';
import PixelAvatar from '../components/PixelAvatar';
import ChatBubble from '../components/ChatBubble';
import { buildSystemPrompt } from '../engine/promptBuilder';
import { getUnlockedSkills, getHiddenSkills } from '../engine/skillEngine';
import { generateTodayEvent } from '../engine/eventGenerator';
import { calculateTrustDelta, isHarmfulMessage } from '../engine/trustEngine';
import { sendMessage } from '../engine/claudeClient';
import { generateConversationTips } from '../engine/conversationHelper';
import { buildMemoryContext, updateMemoryFromTurn } from '../engine/memoryEngine';

const splitAssistantMessages = (value: unknown): string[] => {
  if (typeof value !== 'string') return [];
  return value
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((part) => part.replace(/\n+/g, '\n').trim())
    .filter(Boolean);
};

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentCharacterId,
    relationships,
    addMessage,
    updateTrustLevel,
    setTodayEventTriggered,
    markAskedAbout,
    updateMemoryWing,
  } = useGameStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayEvent, setTodayEvent] = useState<string | null>(null);
  const [conversationTips, setConversationTips] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const character = currentCharacterId ? characters.find((c) => c.id === currentCharacterId) : null;
  const relationship = currentCharacterId ? relationships[currentCharacterId] : null;

  useEffect(() => {
    if (!character || !relationship || !currentCharacterId) return;
    if (!relationship.todayEventTriggered && !todayEvent) {
      const event = generateTodayEvent(character, relationship.lastDailyEvent, relationship.todayEventTriggered);
      if (event) {
        const timer = window.setTimeout(() => {
          setTodayEvent(event);
          setTodayEventTriggered(currentCharacterId, true);
        }, 0);
        return () => window.clearTimeout(timer);
      }
    }
  }, [character, currentCharacterId, relationship, setTodayEventTriggered, todayEvent]);

  useEffect(() => {
    if (!relationship) return;
    const timer = window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
    return () => window.clearTimeout(timer);
  }, [relationship, loading]);

  if (!currentCharacterId) {
    return <div className="p-4 text-center text-sm text-gray-500">正在载入</div>;
  }

  if (!character || !relationship) {
    return <div className="p-4 text-center text-sm text-gray-500">角色不存在</div>;
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');

    addMessage(currentCharacterId, { role: 'user', content: userMessage, timestamp: Date.now() });

    if (isHarmfulMessage(userMessage)) {
      addMessage(currentCharacterId, {
        role: 'assistant',
        content: '我需要一点时间。也许我们改天再聊',
        timestamp: Date.now(),
      });
      updateTrustLevel(currentCharacterId, -15, 'upset');
      return;
    }

    const { trustDelta, emotionChange } = calculateTrustDelta(userMessage, '', !relationship.firstMessageSent);
    const unlockedSkills = getUnlockedSkills(character, relationship.trustLevel, relationship.unlockedSkills);
    const hiddenSkills = getHiddenSkills(character, relationship.trustLevel, relationship.unlockedSkills);
    const memoryContext = buildMemoryContext(relationship.memoryWing, userMessage, relationship.currentEmotion);
    const systemPrompt = buildSystemPrompt(
      character,
      relationship.trustLevel + trustDelta,
      unlockedSkills,
      hiddenSkills,
      todayEvent,
      emotionChange,
      memoryContext
    );

    setLoading(true);

    try {
      const aiResponse = await sendMessage(
        systemPrompt,
        userMessage,
        relationship.conversationHistory.map((m) => ({ role: m.role, content: m.content }))
      );

      let chunks: string[] = [];
      let satisfactionDelta = 3;

      try {
        let jsonStr = aiResponse;
        const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) jsonStr = jsonMatch[1];
        const parsed = JSON.parse(jsonStr);
        satisfactionDelta = parsed.satisfactionDelta ?? 3;
        if (Array.isArray(parsed.messages)) {
          chunks = parsed.messages.flatMap(splitAssistantMessages);
        } else if (parsed.message) {
          chunks = splitAssistantMessages(parsed.message);
        }
      } catch {
        chunks = splitAssistantMessages(aiResponse);
      }
      if (chunks.length === 0) chunks = [aiResponse];

      const mappedLLMDelta = (satisfactionDelta - 3) * 4;
      const finalTrustDelta = trustDelta * 0.4 + mappedLLMDelta * 0.6;
      let finalEmotion: 'neutral' | 'happy' | 'upset' = emotionChange;
      if (satisfactionDelta >= 4) finalEmotion = 'happy';
      else if (satisfactionDelta <= 2) finalEmotion = 'upset';

      updateMemoryWing(currentCharacterId, (latestRelationship) =>
        updateMemoryFromTurn(latestRelationship.memoryWing, {
          characterId: currentCharacterId,
          characterName: character.nickname,
          userMessage,
          assistantMessages: chunks,
          trustDelta: finalTrustDelta,
          trustLevel: latestRelationship.trustLevel + finalTrustDelta,
          emotion: finalEmotion,
          todayEvent,
        })
      );

      const fullText = chunks.join(' ').toLowerCase();
      const zodiacName = character.zodiac
        .replace(/[\u264A\u264F\u264D]/g, '')
        .replace(/[\uFE0E\uFE0F]/g, '')
        .trim();
      if (fullText.includes(character.name)) markAskedAbout(currentCharacterId, 'name');
      if (fullText.includes(character.mbti)) markAskedAbout(currentCharacterId, 'mbti');
      if (fullText.includes(character.zodiac) || fullText.includes(zodiacName)) {
        markAskedAbout(currentCharacterId, 'zodiac');
      }
      if (fullText.includes(character.age.toString())) markAskedAbout(currentCharacterId, 'age');
      if (fullText.includes(character.job)) markAskedAbout(currentCharacterId, 'job');

      chunks.forEach((chunk, i) => {
        setTimeout(() => {
          addMessage(currentCharacterId, {
            role: 'assistant',
            content: chunk,
            timestamp: Date.now(),
            trustDelta: i === 0 ? finalTrustDelta : 0,
          });
        }, i * 300);
      });

      const totalDelay = chunks.length > 1 ? (chunks.length - 1) * 300 + 100 : 100;
      setTimeout(() => {
        updateTrustLevel(currentCharacterId, finalTrustDelta, finalEmotion);
        setConversationTips(generateConversationTips(chunks[chunks.length - 1]));
        setLoading(false);
      }, totalDelay);
    } catch (err) {
      console.error(err);
      addMessage(currentCharacterId, {
        role: 'assistant',
        content: '抱歉，我遇到了一些问题。可以再试一次吗',
        timestamp: Date.now(),
      });
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const trustLevel = relationship.trustLevel;
  const trustLabel = trustLevel < 30 ? '陌生' : trustLevel < 50 ? '认识' : trustLevel < 70 ? '信任' : '深度信任';
  const hasMessages = relationship.conversationHistory.length > 0;

  return (
    <div className="mx-auto flex h-screen w-full max-w-3xl flex-col bg-[#f6f5f2] text-gray-950">
      <header className="flex-shrink-0 border-b border-gray-200 bg-white/85 px-4 pt-3 backdrop-blur">
        <div className="mb-2.5 flex items-center gap-3">
          <button
            onClick={() => navigate('/characters')}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 active:scale-95"
          >
            返回
          </button>

          <div className="h-10 w-8 flex-shrink-0 overflow-hidden rounded-[6px] bg-gray-100">
            <PixelAvatar characterId={character.id} emotion={relationship.currentEmotion} name={character.name} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-gray-950">{character.nickname}</div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="whitespace-nowrap">{trustLabel}</span>
              <div className="h-1 w-12 flex-shrink-0 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${trustLevel}%` }}
                />
              </div>
              <span className="whitespace-nowrap">{trustLevel.toFixed(0)}%</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/profile')}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 active:scale-95"
          >
            档案
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {!hasMessages && (
          <div className="mx-auto mt-10 flex max-w-xs flex-col items-center text-center">
            <div className="mb-4 h-24 w-20 overflow-hidden rounded-[8px] bg-white shadow-sm">
              <PixelAvatar characterId={character.id} emotion="neutral" name={character.name} />
            </div>
            <p className="mb-1 text-sm font-bold text-gray-900">{character.nickname}</p>
            <p className="text-xs leading-5 text-gray-500">
              先从一句自然的问候开始，看看对方今天愿意聊什么
            </p>
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
          <div className="flex items-center gap-2 px-1 py-2">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:300ms]" />
            </div>
            <span className="text-xs text-gray-400">{character.nickname}正在思考</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 pb-4 pt-3">
        {conversationTips.length > 0 && !loading && (
          <div className="mb-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {conversationTips.map((tip, i) => (
                <button
                  key={i}
                  onClick={() => setInput(tip)}
                  className="max-w-[240px] flex-shrink-0 truncate rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95"
                >
                  {tip}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`对 ${character.nickname} 说点什么`}
            disabled={loading}
            rows={2}
            className="max-h-28 min-h-11 flex-1 resize-none rounded-[8px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm leading-5 text-gray-900 placeholder-gray-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] bg-gray-950 text-white transition hover:bg-gray-800 active:scale-95 disabled:bg-gray-200"
            aria-label="发送"
          >
            {loading ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13" />
                <path d="M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
