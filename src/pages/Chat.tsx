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
  } = useGameStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [todayEvent, setTodayEvent] = useState<string | null>(null);
  const [conversationTips, setConversationTips] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const character = currentCharacterId ? characters.find((c) => c.id === currentCharacterId) : null;
  const relationship = currentCharacterId ? relationships[currentCharacterId] : null;

  // All hooks BEFORE any early returns
  useEffect(() => {
    if (!character || !relationship || !currentCharacterId) return;
    if (!relationship.todayEventTriggered && !todayEvent) {
      const event = generateTodayEvent(character, relationship.lastDailyEvent, relationship.todayEventTriggered);
      if (event) {
        setTodayEvent(event);
        setTodayEventTriggered(currentCharacterId, true);
      }
    }
  }, [character?.id]);

  useEffect(() => {
    if (!relationship) return;
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
  }, [relationship?.conversationHistory, loading]);

  if (!currentCharacterId) return <div className="p-4 text-center text-gray-500">Loading...</div>;
  if (!character || !relationship) return <div className="p-4 text-center text-gray-500">Character not found</div>;

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');

    addMessage(currentCharacterId, { role: 'user', content: userMessage, timestamp: Date.now() });

    if (isHarmfulMessage(userMessage)) {
      addMessage(currentCharacterId, { role: 'assistant', content: '...我需要一些时间。也许我们改天再聊？', timestamp: Date.now() });
      updateTrustLevel(currentCharacterId, -15, 'upset');
      return;
    }

    const { trustDelta, emotionChange } = calculateTrustDelta(userMessage, '', !relationship.firstMessageSent);
    const unlockedSkills = getUnlockedSkills(character, relationship.trustLevel, relationship.unlockedSkills);
    const hiddenSkills = getHiddenSkills(character, relationship.trustLevel, relationship.unlockedSkills);
    const systemPrompt = buildSystemPrompt(character, relationship.trustLevel + trustDelta, unlockedSkills, hiddenSkills, todayEvent, emotionChange);

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

      // Map satisfactionDelta (1-5) to trust delta: 3=neutral, each step ±4
      const mappedLLMDelta = (satisfactionDelta - 3) * 4;
      const finalTrustDelta = trustDelta * 0.4 + mappedLLMDelta * 0.6;
      let finalEmotion: 'neutral' | 'happy' | 'upset' = emotionChange;
      if (satisfactionDelta >= 4) finalEmotion = 'happy';
      else if (satisfactionDelta <= 2) finalEmotion = 'upset';

      const fullText = chunks.join(' ').toLowerCase();
      if (fullText.includes(character.name)) markAskedAbout(currentCharacterId, 'name');
      if (fullText.includes(character.mbti)) markAskedAbout(currentCharacterId, 'mbti');
      if (fullText.includes(character.zodiac) || fullText.includes(character.zodiac.replace(/♊|♏|♍/g, ''))) markAskedAbout(currentCharacterId, 'zodiac');
      if (fullText.includes(character.age.toString())) markAskedAbout(currentCharacterId, 'age');
      if (fullText.includes(character.job)) markAskedAbout(currentCharacterId, 'job');
      chunks.forEach((chunk, i) => {
        setTimeout(() => {
          addMessage(currentCharacterId, { role: 'assistant', content: chunk, timestamp: Date.now(), trustDelta: i === 0 ? finalTrustDelta : 0 });
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
      addMessage(currentCharacterId, { role: 'assistant', content: '抱歉，我遇到了一些问题。可以再试一次吗？', timestamp: Date.now() });
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const trustLevel = relationship.trustLevel;
  const trustLabel = trustLevel < 30 ? '陌生人' : trustLevel < 50 ? '认识' : trustLevel < 70 ? '信任' : '非常信任';

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-2xl mx-auto w-full">
      {/* ── Header ── */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 pt-3 pb-0">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate('/characters')}
            className="text-purple-600 text-sm font-medium px-2 py-1 rounded-lg hover:bg-purple-50 active:scale-95 transition-all flex-shrink-0"
          >
            ← 返回
          </button>

          {/* Avatar */}
          <div className="flex-shrink-0 w-10 h-12 overflow-hidden">
            <PixelAvatar characterId={character.id} emotion={relationship.currentEmotion} name={character.name} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{character.nickname}</div>
            <div className="text-xs text-green-500">在线中</div>
          </div>

          <button
            onClick={() => navigate('/profile')}
            className="flex-shrink-0 text-xl px-2 py-1 rounded-lg hover:bg-gray-100 active:scale-95 transition-all"
            title="查看档案"
          >
            📋
          </button>
        </div>

        {/* Trust bar — slim strip at bottom of header */}
        <div className="flex items-center gap-2 pb-2">
          <span className="text-xs text-gray-400 flex-shrink-0 w-12">信任度</span>
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-400 to-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${trustLevel}%` }}
            />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0 w-16 text-right">{trustLevel.toFixed(2)}% · {trustLabel}</span>
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {relationship.conversationHistory.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-24 mx-auto mb-4">
              <PixelAvatar characterId={character.id} emotion="neutral" name={character.name} />
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">开始和{character.nickname}聊天吧！</p>
            <p className="text-xs text-gray-400">你的回答会影响他/她对你的看法</p>
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
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-xs text-gray-400">{character.nickname}正在思考…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 pt-3 pb-safe pb-4 space-y-2">
        {/* Quick reply tips */}
        {conversationTips.length > 0 && !loading && (
          <div className="space-y-1">
            <p className="text-xs text-gray-400 font-medium">💡 试试这样回复：</p>
            <div className="flex flex-wrap gap-1.5">
              {conversationTips.map((tip, i) => (
                <button
                  key={i}
                  onClick={() => setInput(tip)}
                  className="text-xs px-3 py-1.5 bg-purple-50 text-purple-600 rounded-full border border-purple-100 hover:bg-purple-100 active:scale-95 transition-all truncate max-w-[200px]"
                >
                  {tip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Textarea + send */}
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`对${character.nickname}说…`}
            disabled={loading}
            rows={2}
            className="flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent disabled:opacity-50 transition-all"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 h-10 w-10 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 text-white flex items-center justify-center active:scale-95 transition-all"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chat;
