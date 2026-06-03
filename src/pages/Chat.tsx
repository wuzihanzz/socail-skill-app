import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import characters from '../data/characters';
import { useGameStore } from '../store/gameStore';
import PixelAvatar from '../components/PixelAvatar';
import ChatBubble from '../components/ChatBubble';
import { buildSystemPrompt } from '../engine/promptBuilder';
import { getUnlockedSkills, getHiddenSkills } from '../engine/skillEngine';
import { generateTodayEvent } from '../engine/eventGenerator';
import {
  calculateTrustDelta,
  combineTrustDeltas,
  isHarmfulMessage,
  mapSatisfactionToTrustDelta,
} from '../engine/trustEngine';
import { sendMessage } from '../engine/claudeClient';
import { generateConversationTips, type ConversationTip } from '../engine/conversationHelper';
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
    setFirstMessageSent,
    markAskedAbout,
    updateMemoryWing,
  } = useGameStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayEvent, setTodayEvent] = useState<string | null>(null);
  const [selectedTip, setSelectedTip] = useState<ConversationTip | null>(null);
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
    return <div className="bg-[#eef3ed] p-4 text-center text-sm text-[#66756b]">正在载入</div>;
  }

  if (!character || !relationship) {
    return <div className="bg-[#eef3ed] p-4 text-center text-sm text-[#66756b]">角色不存在</div>;
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setSelectedTip(null);

    addMessage(currentCharacterId, { role: 'user', content: userMessage, timestamp: Date.now() });
    if (!relationship.firstMessageSent) setFirstMessageSent(currentCharacterId, true);

    if (isHarmfulMessage(userMessage)) {
      addMessage(currentCharacterId, {
        role: 'assistant',
        content: '我需要一点时间。也许我们改天再聊',
        timestamp: Date.now(),
      });
      updateTrustLevel(currentCharacterId, -6, 'upset', 'withdrawn', '用户说了严重伤害或威胁性的话');
      return;
    }

    const trustAnalysis = calculateTrustDelta(userMessage, '', !relationship.firstMessageSent);
    const promptConflictState =
      trustAnalysis.conflictState !== 'none' ? trustAnalysis.conflictState : relationship.conflictState;
    const promptConflictSummary = trustAnalysis.conflictSummary ?? relationship.lastConflictSummary;
    const unlockedSkills = getUnlockedSkills(character, relationship.trustLevel, relationship.unlockedSkills);
    const hiddenSkills = getHiddenSkills(character, relationship.trustLevel, relationship.unlockedSkills);
    const memoryContext = buildMemoryContext(relationship.memoryWing, userMessage, relationship.currentEmotion);
    const systemPrompt = buildSystemPrompt(
      character,
      relationship.trustLevel + trustAnalysis.trustDelta,
      unlockedSkills,
      hiddenSkills,
      todayEvent,
      trustAnalysis.emotionChange,
      memoryContext,
      promptConflictState,
      promptConflictSummary
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

      const mappedLLMDelta = mapSatisfactionToTrustDelta(satisfactionDelta);
      const finalTrustDelta = combineTrustDeltas(trustAnalysis.trustDelta, mappedLLMDelta);
      let finalEmotion: 'neutral' | 'happy' | 'upset' = trustAnalysis.emotionChange;
      if (satisfactionDelta >= 4) finalEmotion = 'happy';
      else if (satisfactionDelta <= 2) finalEmotion = 'upset';
      const finalConflictState =
        trustAnalysis.conflictState !== 'none'
          ? trustAnalysis.conflictState
          : finalTrustDelta <= -5
            ? 'withdrawn'
            : finalTrustDelta <= -3
              ? 'hurt'
              : finalTrustDelta < 0
              ? 'awkward'
              : relationship.conflictState !== 'none'
                ? finalTrustDelta > 1
                  ? 'repairing'
                  : relationship.conflictState
                : 'none';

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
        updateTrustLevel(
          currentCharacterId,
          finalTrustDelta,
          finalEmotion,
          finalConflictState,
          trustAnalysis.conflictSummary
        );
        setSelectedTip(null);
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
  const lastAssistantMessage = [...relationship.conversationHistory].reverse().find((msg) => msg.role === 'assistant');
  const lastUserMessage = [...relationship.conversationHistory].reverse().find((msg) => msg.role === 'user');
  const conversationTips = generateConversationTips(lastAssistantMessage?.content ?? '', {
    trustLevel: relationship.trustLevel,
    emotion: relationship.currentEmotion,
    conflictState: relationship.conflictState,
    lastUserMessage: lastUserMessage?.content,
    lastTrustDelta: lastAssistantMessage?.trustDelta,
  });
  const visibleSelectedTip = conversationTips.some((tip) => tip.id === selectedTip?.id) ? selectedTip : null;

  return (
    <div className="mx-auto flex h-screen w-full max-w-3xl flex-col bg-[#eef3ed] text-[#1f3128]">
      <header className="flex-shrink-0 border-b border-[#d9e4dc] bg-[#fbfdf8]/90 px-4 pt-3 backdrop-blur">
        <div className="mb-2.5 flex items-center gap-3">
          <button
            onClick={() => navigate('/characters')}
            className="rounded-full border border-[#d9e4dc] bg-white px-3 py-1.5 text-sm font-bold text-[#1f3128] transition hover:border-[#b8cbbb] active:scale-95"
          >
            返回
          </button>

          <div className="h-10 w-8 flex-shrink-0 overflow-hidden rounded-[8px] bg-white">
            <PixelAvatar characterId={character.id} emotion={relationship.currentEmotion} name={character.name} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-[#1f3128]">{character.nickname}</div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-[#66756b]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4f735f]" />
              <span className="whitespace-nowrap">{trustLabel}</span>
              <div className="h-1 w-12 flex-shrink-0 overflow-hidden rounded-full bg-[#dce9df]">
                <div
                  className="h-full rounded-full bg-[#4f735f] transition-all duration-500"
                  style={{ width: `${trustLevel}%` }}
                />
              </div>
              <span className="whitespace-nowrap">{trustLevel.toFixed(0)}%</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/profile')}
            className="rounded-full border border-[#d9e4dc] bg-white px-3 py-1.5 text-sm font-bold text-[#1f3128] transition hover:border-[#b8cbbb] active:scale-95"
          >
            档案
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {!hasMessages && (
          <div className="mx-auto mt-10 flex max-w-xs flex-col items-center text-center">
            <div className="mb-4 h-24 w-20 overflow-hidden rounded-[18px] bg-white shadow-sm">
              <PixelAvatar characterId={character.id} emotion="neutral" name={character.name} />
            </div>
            <p className="mb-1 text-sm font-black text-[#1f3128]">{character.nickname}</p>
            <p className="text-xs font-semibold leading-5 text-[#66756b]">
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
            <span className="text-xs text-[#66756b]">{character.nickname}正在思考</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 border-t border-[#d9e4dc] bg-[#fbfdf8] px-4 pb-4 pt-3">
        {conversationTips.length > 0 && !loading && (
          <div className="mb-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {conversationTips.map((tip) => (
                <button
                  key={tip.id}
                  onClick={() => setSelectedTip(selectedTip?.id === tip.id ? null : tip)}
                  className={`max-w-[240px] flex-shrink-0 truncate rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
                    visibleSelectedTip?.id === tip.id
                      ? 'border-[#4f735f] bg-[#dce9df] text-[#1f3128] shadow-sm'
                      : 'border-[#d9e4dc] bg-white text-[#66756b] hover:border-[#4f735f] hover:bg-[#dce9df] hover:text-[#1f3128]'
                  }`}
                >
                  {tip.label}
                </button>
              ))}
            </div>

            {visibleSelectedTip && (
              <div className="mt-2 animate-[tip-pop_180ms_ease-out] rounded-[16px] border border-[#d9e4dc] bg-white p-3 shadow-[0_12px_32px_rgba(31,49,40,0.08)]">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#1f3128]">{visibleSelectedTip.title}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-[#66756b]">可以从这些方向回复：</p>
                  </div>
                  <button
                    onClick={() => setSelectedTip(null)}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-[#d9e4dc] text-[#66756b] transition hover:border-[#4f735f] hover:text-[#1f3128]"
                    aria-label="关闭启发"
                  >
                    ×
                  </button>
                </div>

                <div className="grid gap-1.5 sm:grid-cols-3">
                  {visibleSelectedTip.guidance.map((item) => (
                    <div
                      key={item}
                      className="rounded-[10px] bg-[#eef3ed] px-2.5 py-2 text-xs font-semibold leading-5 text-[#405147]"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-2 rounded-[12px] border border-[#d9e4dc] bg-[#fbfdf8] px-3 py-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-[#8b968f]">可以这样起稿</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[#1f3128]">{visibleSelectedTip.example}</p>
                </div>

                <button
                  onClick={() => setInput(visibleSelectedTip.example)}
                  className="mt-2 w-full rounded-[12px] bg-[#1f3128] px-3 py-2 text-sm font-black text-white transition hover:bg-[#2d4538] active:scale-[0.99]"
                >
                  填入这句，再自己改改
                </button>
              </div>
            )}
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
            className="max-h-28 min-h-11 flex-1 resize-none rounded-[14px] border border-[#d9e4dc] bg-white px-3 py-2.5 text-sm leading-5 text-[#1f3128] placeholder-[#8b968f] transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4f735f] disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] bg-[#1f3128] text-white transition hover:bg-[#2d4538] active:scale-95 disabled:bg-[#d9e4dc]"
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
