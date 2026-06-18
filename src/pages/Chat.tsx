import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import characters from '../data/characters';
import { useGameStore } from '../store/gameStore';
import PixelAvatar, { type CharacterVisualState } from '../components/PixelAvatar';
import ChatBubble from '../components/ChatBubble';
import { buildSystemPrompt } from '../engine/promptBuilder';
import { getUnlockedSkills, getHiddenSkills } from '../engine/skillEngine';
import { generateTodayEvent } from '../engine/eventGenerator';
import { sanitizeAssistantMessage } from '../engine/assistantOutput';
import {
  applyPositiveTrustMomentum,
  calculateTrustDelta,
  combineTrustDeltas,
  isHarmfulMessage,
  mapSatisfactionToTrustDelta,
} from '../engine/trustEngine';
import { sendMessage } from '../engine/claudeClient';
import { generateConversationTips, type ConversationTip } from '../engine/conversationHelper';
import {
  buildMemoryContext,
  extractMemoryDrawersFromTurn,
  updateMemoryFromTurn,
} from '../engine/memoryEngine';
import { buildUserProfileSummary } from '../engine/userProfileEngine';
import {
  formatLongTermMemoryContext,
  saveLongTermMemories,
  searchLongTermMemories,
} from '../lib/memoryApi';
import {
  createMilestoneEventMessage,
  createMilestoneNotice,
  getCrossedTrustMilestones,
  getRelationshipStage,
} from '../engine/relationshipMilestones';
import type { Message, UserProfile } from '../types/index';

const getFeedbackVisualState = (trustDelta: number): CharacterVisualState => {
  if (trustDelta >= 4) return 'delighted';
  if (trustDelta > 0) return 'happy';
  if (trustDelta <= -4) return 'upset';
  if (trustDelta < 0) return 'puzzled';
  return 'neutral';
};

const getVisualStatus = (state: CharacterVisualState): string => {
  const labels: Record<CharacterVisualState, string> = {
    idle: '在等你开口',
    neutral: '认真听着',
    thinking: '正在想怎么回应',
    happy: '被你说得有点开心',
    delighted: '好像真的被你说动了',
    puzzled: '有点没听懂你的意思',
    upset: '需要一点时间消化',
  };
  return labels[state];
};

type SpeechRecognitionEventResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionEventResult[];
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
};

const splitLongAssistantPart = (part: string): string[] => {
  const maxLength = 34;
  if (part.length <= maxLength) return [part];

  const clauses = part
    .split(/(?<=[，,、；;])\s*/)
    .map((clause) => clause.trim())
    .filter(Boolean);

  if (clauses.length <= 1) {
    return part.match(new RegExp(`.{1,${maxLength}}`, 'g')) ?? [part];
  }

  const chunks: string[] = [];
  let current = '';

  clauses.forEach((clause) => {
    if (current && `${current}${clause}`.length > maxLength) {
      chunks.push(current.trim());
      current = clause;
      return;
    }
    current = `${current}${clause}`;
  });

  if (current.trim()) chunks.push(current.trim());
  return chunks.flatMap((chunk) => (chunk.length > maxLength ? chunk.match(new RegExp(`.{1,${maxLength}}`, 'g')) ?? [chunk] : [chunk]));
};

const normalizeAssistantChunks = (chunks: string[]): string[] => {
  const result: string[] = [];

  chunks.forEach((chunk) => {
    const cleaned = sanitizeAssistantMessage(chunk.replace(/[。！？!?]$/, '').trim());
    if (!cleaned) return;

    const previous = result[result.length - 1];
    if (previous && previous.length <= 5 && previous.length + cleaned.length <= 34) {
      result[result.length - 1] = `${previous}${cleaned}`;
      return;
    }

    result.push(cleaned);
  });

  return result;
};

const splitAssistantMessages = (value: unknown): string[] => {
  if (typeof value !== 'string') return [];
  const chunks = value
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .flatMap((block) => block.replace(/\n+/g, '\n').split(/\n+|(?<=[。！？!?])\s*/))
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap(splitLongAssistantPart);

  return normalizeAssistantChunks(chunks);
};

const getConsecutivePositiveTrustTurns = (messages: Message[]): number => {
  let count = 0;

  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== 'assistant' || message.trustDelta === undefined) continue;
    if (message.trustDelta > 0) {
      count += 1;
      continue;
    }
    break;
  }

  return count;
};

const getPreferredUserAddress = (
  profile: UserProfile | null,
  fallbackName?: string
): string | null => {
  const preferredAddress = profile?.facts.find((fact) => fact.type === 'preferredAddress')?.value;
  const displayName = profile?.facts.find((fact) => fact.type === 'displayName')?.value;
  const value = preferredAddress || displayName || fallbackName;
  if (!value || value === '练习者' || value === '游客') return null;
  return value;
};

const getShareableProfileHint = (profile: UserProfile | null): string | null => {
  const fact = profile?.facts
    .filter((item) =>
      ['hobby', 'occupationOrStudy', 'communicationPreference'].includes(item.type)
    )
    .sort((a, b) => {
      const confirmedDelta = Number(b.userConfirmed) - Number(a.userConfirmed);
      if (confirmedDelta !== 0) return confirmedDelta;
      return b.confidence - a.confidence || b.updatedAt - a.updatedAt;
    })[0];

  if (!fact) return null;
  if (fact.type === 'hobby') return `听说你喜欢${fact.value}`;
  if (fact.type === 'occupationOrStudy') return `听说你最近在做${fact.value}`;
  if (fact.type === 'communicationPreference') return `听说你更习惯${fact.value}`;
  return null;
};

const createCharacterIntroduction = (
  characterId: string,
  referrerNickname: string | null,
  userAddress: string | null,
  profileHint: string | null
): string => {
  const address = userAddress ? `，${userAddress}` : '';
  const hint = profileHint ? `，${profileHint}` : '';

  if (referrerNickname) {
    const introductions: Record<string, string> = {
      'chen-wei': `哦${address}，我听${referrerNickname}说起过你${hint}。先别期待太多，我们慢慢聊`,
      'lin-xue': `原来是你${address}。我听${referrerNickname}提起过你${hint}，还挺想认识你的`,
      'xiao-mei': `你好${address}。我听${referrerNickname}说起过你${hint}，不用紧张，慢慢聊就好`,
    };
    return introductions[characterId] ?? `你好${address}。我听${referrerNickname}说起过你`;
  }

  const introductions: Record<string, string> = {
    'chen-wei': `你好${address}。先叫我熬夜的猫就好`,
    'lin-xue': `你好呀${address}。先叫我彩色的梦想家吧`,
    'xiao-mei': `你好${address}。先叫我温暖的小天使就好`,
  };
  return introductions[characterId] ?? `你好${address}`;
};

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentCharacterId,
    session,
    userProfile,
    relationships,
    addMessage,
    updateTrustLevel,
    setTodayEventTriggered,
    setFirstMessageSent,
    markAskedAbout,
    markTrustMilestones,
    updateMemoryWing,
    extractUserProfileFromMessage,
  } = useGameStore();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [visualState, setVisualState] = useState<CharacterVisualState>('idle');
  const [todayEvent, setTodayEvent] = useState<string | null>(null);
  const [selectedTip, setSelectedTip] = useState<ConversationTip | null>(null);
  const [milestoneNotice, setMilestoneNotice] = useState<{ title: string; body: string } | null>(null);
  const [speechSupported, setSpeechSupported] = useState(() => Boolean(getSpeechRecognitionConstructor()));
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const visualTimerRef = useRef<number | null>(null);

  const character = currentCharacterId ? characters.find((c) => c.id === currentCharacterId) : null;
  const relationship = currentCharacterId ? relationships[currentCharacterId] : null;

  useEffect(() => {
    if (
      !character ||
      !relationship ||
      !currentCharacterId ||
      session?.mode !== 'account' ||
      relationship.conversationHistory.length > 0
    ) {
      return;
    }

    const referrer = characters
      .filter((candidate) => candidate.id !== currentCharacterId)
      .map((candidate) => ({
        character: candidate,
        lastMessage:
          relationships[candidate.id]?.conversationHistory[
            relationships[candidate.id].conversationHistory.length - 1
          ],
      }))
      .filter((item) => item.lastMessage)
      .sort((a, b) => (b.lastMessage?.timestamp ?? 0) - (a.lastMessage?.timestamp ?? 0))[0];

    addMessage(currentCharacterId, {
      role: 'assistant',
      content: createCharacterIntroduction(
        character.id,
        referrer?.character.nickname ?? null,
        getPreferredUserAddress(userProfile, session.displayName),
        getShareableProfileHint(userProfile)
      ),
      timestamp: Date.now(),
      trustDelta: 0,
    });
  }, [
    addMessage,
    character,
    currentCharacterId,
    relationship,
    relationships,
    session,
    userProfile,
  ]);

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

  useEffect(() => {
    const viewport = window.visualViewport;
    const updateViewport = () => {
      const viewportHeight = viewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty('--chat-viewport-height', `${viewportHeight}px`);
      setIsCompactViewport(viewportHeight < 520);
    };

    updateViewport();
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      document.documentElement.style.removeProperty('--chat-viewport-height');
    };
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
  }, [input]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      if (visualTimerRef.current) window.clearTimeout(visualTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (visualTimerRef.current) {
      window.clearTimeout(visualTimerRef.current);
      visualTimerRef.current = null;
    }
    const timer = window.setTimeout(() => setVisualState('idle'), 0);
    return () => window.clearTimeout(timer);
  }, [currentCharacterId]);

  if (!currentCharacterId) {
    return <div className="bg-[#eef3ed] p-4 text-center text-sm text-[#66756b]">正在载入</div>;
  }

  if (!character || !relationship) {
    return <div className="bg-[#eef3ed] p-4 text-center text-sm text-[#66756b]">角色不存在</div>;
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    const userMessage = input.trim();
    setInput('');
    setSelectedTip(null);
    setMilestoneNotice(null);

    addMessage(currentCharacterId, { role: 'user', content: userMessage, timestamp: Date.now() });
    extractUserProfileFromMessage(userMessage);
    if (!relationship.firstMessageSent) setFirstMessageSent(currentCharacterId, true);

    if (isHarmfulMessage(userMessage)) {
      setVisualState('upset');
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
    const localMemoryContext = buildMemoryContext(
      relationship.memoryWing,
      userMessage,
      relationship.currentEmotion,
      6
    );
    let memoryContext = localMemoryContext;
    if (session?.mode === 'account') {
      try {
        const longTermMemories = await searchLongTermMemories(currentCharacterId, userMessage, 6);
        const cloudMemoryContext = formatLongTermMemoryContext(longTermMemories.entries);
        memoryContext = cloudMemoryContext || localMemoryContext;
      } catch (error) {
        console.error('Failed to retrieve long-term memories:', error);
      }
    }
    const userProfileSummary = buildUserProfileSummary(userProfile, 10);
    const systemPrompt = buildSystemPrompt(
      character,
      relationship.trustLevel + trustAnalysis.trustDelta,
      unlockedSkills,
      hiddenSkills,
      todayEvent,
      trustAnalysis.emotionChange,
      memoryContext,
      userProfileSummary,
      promptConflictState,
      promptConflictSummary
    );

    setVisualState('thinking');
    setLoading(true);

    try {
      const aiResponse = await sendMessage(
        systemPrompt,
        userMessage,
        relationship.conversationHistory
          .slice(-12)
          .map((m) => ({ role: m.role, content: m.content }))
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
      if (chunks.length === 0) {
        const fallback = sanitizeAssistantMessage(aiResponse);
        chunks = fallback ? [fallback] : ['我刚才有点走神了，你再说一遍'];
      }

      const mappedLLMDelta = mapSatisfactionToTrustDelta(satisfactionDelta);
      const baseTrustDelta = combineTrustDeltas(trustAnalysis.trustDelta, mappedLLMDelta);
      const finalTrustDelta = applyPositiveTrustMomentum(
        baseTrustDelta,
        getConsecutivePositiveTrustTurns(relationship.conversationHistory)
      );
      const projectedTrustLevel = Math.max(0, Math.min(100, relationship.trustLevel + finalTrustDelta));
      const crossedMilestones = getCrossedTrustMilestones(
        relationship.trustLevel,
        projectedTrustLevel,
        relationship.achievedMilestones
      );
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
      const feedbackVisualState = getFeedbackVisualState(finalTrustDelta);
      setVisualState(feedbackVisualState);

      const memoryInput = {
        characterId: currentCharacterId,
        characterName: character.nickname,
        userMessage,
        assistantMessages: chunks,
        trustDelta: finalTrustDelta,
        trustLevel: relationship.trustLevel + finalTrustDelta,
        emotion: finalEmotion,
        todayEvent,
      };
      const extractedMemories = extractMemoryDrawersFromTurn(memoryInput);
      updateMemoryWing(currentCharacterId, (latestRelationship) =>
        updateMemoryFromTurn(latestRelationship.memoryWing, {
          ...memoryInput,
          trustLevel: latestRelationship.trustLevel + finalTrustDelta,
        })
      );
      if (session?.mode === 'account' && extractedMemories.length > 0) {
        void saveLongTermMemories(currentCharacterId, extractedMemories).catch((error) => {
          console.error('Failed to save long-term memories:', error);
        });
      }

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
      if (visualTimerRef.current) window.clearTimeout(visualTimerRef.current);
      visualTimerRef.current = window.setTimeout(() => {
        visualTimerRef.current = null;
        setVisualState(
          finalEmotion === 'happy'
            ? 'happy'
            : finalEmotion === 'upset'
              ? 'upset'
              : 'neutral'
        );
      }, totalDelay + 2400);
      setTimeout(() => {
        updateTrustLevel(
          currentCharacterId,
          finalTrustDelta,
          finalEmotion,
          finalConflictState,
          trustAnalysis.conflictSummary
        );
        if (crossedMilestones.length > 0) {
          markTrustMilestones(
            currentCharacterId,
            crossedMilestones.map((milestone) => milestone.threshold)
          );
          setMilestoneNotice(createMilestoneNotice(character, crossedMilestones[crossedMilestones.length - 1]));
          const milestoneEvent = [...crossedMilestones]
            .reverse()
            .map((milestone) => createMilestoneEventMessage(character, milestone))
            .find((message): message is string => Boolean(message));
          if (milestoneEvent) {
            window.setTimeout(() => {
              addMessage(currentCharacterId, {
                role: 'assistant',
                content: milestoneEvent,
                timestamp: Date.now(),
                trustDelta: 0,
              });
            }, 500);
          }
        }
        setSelectedTip(null);
        setLoading(false);
      }, totalDelay);
    } catch (err) {
      console.error(err);
      setVisualState('puzzled');
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

  const handleToggleSpeech = () => {
    if (!speechSupported || loading) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = getSpeechRecognitionConstructor();
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setSpeechError('当前浏览器暂不支持语音输入');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;
    recognition.continuous = false;

    let baseInput = input.trim();

    recognition.onresult = (event) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript;
        } else {
          interimText += result[0].transcript;
        }
      }

      const nextSpeechText = `${finalText}${interimText}`.trim();
      if (!nextSpeechText) return;
      setInput([baseInput, nextSpeechText].filter(Boolean).join(baseInput ? ' ' : ''));
      if (finalText.trim()) baseInput = [baseInput, finalText.trim()].filter(Boolean).join(baseInput ? ' ' : '');
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setSpeechError(event.error === 'not-allowed' ? '需要允许麦克风权限才能语音输入' : '语音输入暂时不可用');
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setSpeechError(null);
    setIsListening(true);

    try {
      recognition.start();
    } catch {
      setIsListening(false);
      setSpeechError('语音输入启动失败，可以稍后再试');
    }
  };

  const trustLevel = relationship.trustLevel;
  const trustLabel = getRelationshipStage(trustLevel).label;
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
    <div
      className="mx-auto flex h-[100dvh] min-h-0 w-full max-w-3xl flex-col bg-[#eef3ed] text-[#1f3128]"
      style={{ height: 'var(--chat-viewport-height, 100dvh)' }}
    >
      <header className="flex-shrink-0 border-b border-[#d9e4dc] bg-[#fbfdf8]/90 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur sm:px-4">
        <div className="mb-2 flex items-center gap-2.5 sm:mb-2.5 sm:gap-3">
          <button
            onClick={() => navigate('/characters')}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#d9e4dc] bg-white text-sm font-bold text-[#1f3128] transition hover:border-[#b8cbbb] active:scale-95 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5"
            aria-label="返回角色选择"
          >
            <span className="text-lg leading-none sm:hidden">←</span>
            <span className="hidden sm:inline">返回</span>
          </button>

          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-[14px] bg-[#eef3ed] sm:h-16 sm:w-16 sm:rounded-[16px]">
            <PixelAvatar
              characterId={character.id}
              emotion={relationship.currentEmotion}
              state={visualState}
              name={character.name}
              framing="face"
            />
            {visualState === 'thinking' && (
              <span className="absolute -right-1 top-1 flex gap-0.5" aria-hidden="true">
                <span className="h-1 w-1 animate-pulse rounded-full bg-[#4f735f]" />
                <span className="h-1 w-1 animate-pulse rounded-full bg-[#4f735f] [animation-delay:180ms]" />
                <span className="h-1 w-1 animate-pulse rounded-full bg-[#4f735f] [animation-delay:360ms]" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-[#1f3128] sm:text-base">{character.nickname}</div>
            <div className="mt-0.5 truncate text-[10px] font-bold text-[#4f735f]">
              {getVisualStatus(visualState)}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[#66756b] sm:gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4f735f]" />
              <span className="whitespace-nowrap">{trustLabel}</span>
              <div className="h-1 min-w-6 flex-1 overflow-hidden rounded-full bg-[#dce9df] sm:w-12 sm:flex-none">
                <div
                  className="h-full rounded-full bg-[#4f735f] transition-all duration-500"
                  style={{ width: `${trustLevel}%` }}
                />
              </div>
              <span className="whitespace-nowrap">{trustLevel.toFixed(0)}%</span>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              onClick={() => navigate('/me', { state: { returnTo: '/chat' } })}
              className="rounded-full border border-[#d9e4dc] bg-white px-3 py-1.5 text-sm font-bold text-[#1f3128] transition hover:border-[#b8cbbb] active:scale-95"
            >
              画像
            </button>

            <button
              onClick={() => navigate('/profile')}
              className="rounded-full border border-[#d9e4dc] bg-white px-3 py-1.5 text-sm font-bold text-[#1f3128] transition hover:border-[#b8cbbb] active:scale-95"
            >
              档案
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pb-2 sm:hidden">
          <button
            onClick={() => navigate('/me', { state: { returnTo: '/chat' } })}
            className="rounded-full border border-[#d9e4dc] bg-white py-1.5 text-xs font-bold text-[#405147] transition active:scale-[0.98]"
          >
            我的画像
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="rounded-full border border-[#d9e4dc] bg-white py-1.5 text-xs font-bold text-[#405147] transition active:scale-[0.98]"
          >
            关系档案
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-3 py-4 sm:px-4 sm:py-5">
        {!hasMessages && (
          <div className="mx-auto mt-10 flex max-w-xs flex-col items-center text-center">
            <div className="mb-4 h-28 w-28 overflow-hidden rounded-[24px] bg-white/70 shadow-sm">
              <PixelAvatar
                characterId={character.id}
                emotion="neutral"
                state={visualState}
                name={character.name}
                framing="face"
              />
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

        {milestoneNotice && !loading && (
          <div className="mx-auto my-4 max-w-sm rounded-[18px] border border-[#cbded0] bg-[#fbfdf8] px-4 py-3 text-center shadow-[0_12px_32px_rgba(31,49,40,0.08)]">
            <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#6f8b76]">关系变化</p>
            <p className="mt-1 text-sm font-black text-[#1f3128]">{milestoneNotice.title}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#66756b]">{milestoneNotice.body}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 border-t border-[#d9e4dc] bg-[#fbfdf8] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 sm:px-4 sm:pb-4 sm:pt-3">
        {conversationTips.length > 0 && !loading && !isCompactViewport && (
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
          {speechSupported && (
            <button
              onClick={handleToggleSpeech}
              disabled={loading}
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] border transition active:scale-95 disabled:opacity-50 ${
                isListening
                  ? 'border-[#4f735f] bg-[#dce9df] text-[#1f3128] shadow-[0_0_0_4px_rgba(79,115,95,0.12)]'
                  : 'border-[#d9e4dc] bg-white text-[#66756b] hover:border-[#4f735f] hover:text-[#1f3128]'
              }`}
              aria-label={isListening ? '停止语音输入' : '开始语音输入'}
              title={isListening ? '停止语音输入' : '语音输入'}
            >
              {isListening ? (
                <span className="h-3 w-3 rounded-full bg-[#4f735f]" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <path d="M12 19v3" />
                </svg>
              )}
            </button>
          )}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            onFocus={() => {
              window.setTimeout(() => messagesEndRef.current?.scrollIntoView({ block: 'end' }), 120);
            }}
            placeholder={isListening ? '正在听你说话...' : `对 ${character.nickname} 说点什么`}
            disabled={loading}
            rows={1}
            className="max-h-28 min-h-11 flex-1 resize-none overflow-y-auto rounded-[14px] border border-[#d9e4dc] bg-white px-3 py-2.5 text-base leading-6 text-[#1f3128] placeholder-[#8b968f] transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#4f735f] disabled:opacity-50 sm:text-sm sm:leading-5"
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
        {(isListening || speechError) && (
          <p className="mt-2 text-xs font-semibold text-[#66756b]">
            {isListening
              ? '正在听你说话，识别后会先放进输入框。'
              : speechError}
          </p>
        )}
      </div>
    </div>
  );
};

export default Chat;
