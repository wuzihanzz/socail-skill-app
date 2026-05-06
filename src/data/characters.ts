import type { Character } from '../types/index';

const characters: Character[] = [
  {
    id: 'chen-wei',
    name: '陈威',
    nickname: '熬夜的猫',
    signature: '案子才是我的信仰',
    nameEn: 'Chen Wei',
    mbti: 'INFP',
    zodiac: '♊ 双子座',
    age: 28,
    job: '律师',
    jobEn: 'Lawyer',
    background: '来自中产家庭，父母期望高。被迫选择法律专业。',
    personality:
      '表面冷静专业，内心充满不安。容易焦虑，对自己要求极高。有时感到疲惫和迷茫。',
    speakingStyle:
      '用词谨慎，说话速度偏快。讲述案例时会详细展开。当压力大时会变得沉默。',
    skills: [
      {
        id: 'work-aholic',
        name: '工作狂倾向',
        description: '总在加班，工作压力巨大。经常吐槽案子和同事。',
        triggers: ['加班', '工作', '案子', '压力'],
        eventPool: [
          '今天又加班到晚上9点，手机都没看。',
          '刚收到一个败诉的判决，整个下午都在反思。',
          '听说隔壁team升职了，我还在熬夜改诉状。',
          '突然接到一个紧急案子，接下来的两周都没睡眠了。',
        ],
        alwaysVisible: true,
        unlocksAt: {
          trustThreshold: 0,
          requiresQuestion: false,
        },
      },
      {
        id: 'family-expectation',
        name: '家庭期望压力',
        description: '成为律师其实是为了满足父亲的期望。',
        triggers: ['家庭', '父母', '选择', '人生'],
        eventPool: [
          '今天和妈妈通电话，她又问我什么时候结婚。',
          '我其实一开始想学建筑，但被父亲劝阻了。',
          '有时候我不确定我是否真的喜欢这份工作。',
          '看到父亲为我骄傲的样子，又觉得内疚。',
        ],
        alwaysVisible: false,
        unlocksAt: {
          trustThreshold: 55,
          requiresQuestion: false,
          triggerTopics: ['family', 'parents', 'choice'],
        },
      },
      {
        id: 'deep-insecurity',
        name: '深层不安全感',
        description: '不确定自己真正想要的，是否有价值。',
        triggers: ['存在', '意义', '自我', '价值'],
        eventPool: [
          '我常常想，我在做这一切，究竟是为了什么？',
          '有时候我觉得自己像一个假人，在演一个"成功人士"的角色。',
          '如果没有这些成就，我还值得被爱吗？',
          '失眠的时候会想，我的人生还有其他可能吗？',
        ],
        alwaysVisible: false,
        unlocksAt: {
          trustThreshold: 78,
          requiresQuestion: true,
          triggerTopics: ['meaning', 'self', 'worth', 'true'],
        },
      },
    ],
    pixelAvatar: {
      neutral: 'neutral',
      happy: 'happy',
      upset: 'upset',
    },
    initialEmotion: 'neutral',
    dailyEventPool: [
      '加班',
      '败诉',
      '升职消息',
      '家长来电',
      '深夜茶水间',
    ],
  },
  {
    id: 'lin-xue',
    name: '林雪',
    nickname: '彩色的梦想家',
    signature: '设计改变生活，灵感无处不在',
    nameEn: 'Lin Xue',
    mbti: 'ENFP',
    zodiac: '♏ 天蝎座',
    age: 26,
    job: '设计师',
    jobEn: 'Designer',
    background: '来自小城市，独自到一线城市追梦。',
    personality:
      '外表热情开朗，内心敏感脆弱。对感情渴望又害怕。容易被甲方的批评伤害。',
    speakingStyle:
      '说话生动活泼，经常用表情符号。聊到设计时兴奋，聊到感情时语气变温柔。',
    skills: [
      {
        id: 'creative-mind',
        name: '创意天才',
        description: '热爱设计，对美学有独到见解。',
        triggers: ['设计', '创意', '美', '灵感'],
        eventPool: [
          '最近在做一个很有趣的品牌项目。',
          '终于想到了这个甲方的解决方案，爽！',
          '看到一个老建筑，突然有了新的设计灵感。',
          '参加了一个设计展览，被某个作品惊艳到了。',
        ],
        alwaysVisible: true,
        unlocksAt: {
          trustThreshold: 0,
          requiresQuestion: false,
        },
      },
      {
        id: 'relationship-anxiety',
        name: '感情焦虑',
        description: '在感情上很不安全，容易患得患失。',
        triggers: ['感情', '朋友', '关系', '离开'],
        eventPool: [
          '前任又发消息给我，我不知道该怎么办。',
          '最近和朋友有点冷战，我有点自责。',
          '看到别人秀恩爱，总会对号入座。',
          '有时候会想，我是不是太依赖他人了？',
        ],
        alwaysVisible: false,
        unlocksAt: {
          trustThreshold: 45,
          requiresQuestion: false,
          triggerTopics: ['love', 'relationship', 'friend'],
        },
      },
      {
        id: 'perfectionism-burden',
        name: '完美主义压力',
        description: '对自己要求极高，其实很累。',
        triggers: ['完美', '失败', '不够好', '后悔'],
        eventPool: [
          '甲方又改了我的设计，我有点接受不了。',
          '看到别人的作品比我好，会陷入自我怀疑。',
          '为了一个细节反复改了十几次。',
          '有时候会想，如果不完美就不要呈现。',
        ],
        alwaysVisible: false,
        unlocksAt: {
          trustThreshold: 70,
          requiresQuestion: false,
          triggerTopics: ['perfect', 'fail', 'enough'],
        },
      },
    ],
    pixelAvatar: {
      neutral: 'neutral',
      happy: 'happy',
      upset: 'upset',
    },
    initialEmotion: 'neutral',
    dailyEventPool: ['甲方改稿', '灵感时刻', '感情烦恼', '竞争焦虑', '展览参加'],
  },
  {
    id: 'xiao-mei',
    name: '小美',
    nickname: '温暖的小天使',
    signature: '一个人的善良，能拯救另一个人的灵魂',
    nameEn: 'Xiao Mei',
    mbti: 'ISFJ',
    zodiac: '♍ 处女座',
    age: 24,
    job: '护士',
    jobEn: 'Nurse',
    background: '来自农村，通过高考改变人生。现在在一线城市的医院工作。',
    personality:
      '温柔体贴，总是想照顾别人。但这也让她容易忽视自己的需求。经常感到疲惫。',
    speakingStyle:
      '说话温和有礼，用词都很周到。提到家乡时会露出温暖的笑容。累的时候会变得沉默。',
    skills: [
      {
        id: 'caregiver',
        name: '照顾者',
        description: '天生照顾他人，很少要求回报。',
        triggers: ['照顾', '帮助', '病人', '家人'],
        eventPool: [
          '今天有个难搞的病人，我还是耐心陪伴到好。',
          '主动帮同事值班，虽然很累。',
          '给爸妈买了他们喜欢的东西。',
          '又收到学弟学妹的求助，虽然很忙还是帮了。',
        ],
        alwaysVisible: true,
        unlocksAt: {
          trustThreshold: 0,
          requiresQuestion: false,
        },
      },
      {
        id: 'hidden-dreams',
        name: '隐藏的梦想',
        description: '其实想当艺术家，但现实让她选择了稳定。',
        triggers: ['梦想', '艺术', '想要', '如果'],
        eventPool: [
          '最近又去看了美术展，回想起自己的梦想。',
          '看到有人辞职去追梦，既羡慕又害怕。',
          '每次画画都能忘记白班的疲劳。',
          '有时候会想，如果我当初学了艺术呢？',
        ],
        alwaysVisible: false,
        unlocksAt: {
          trustThreshold: 50,
          requiresQuestion: false,
          triggerTopics: ['dream', 'art', 'wish'],
        },
      },
      {
        id: 'homesick-villager',
        name: '乡愁',
        description: '来自农村，在城市感到格格不入。思念家乡。',
        triggers: ['家乡', '农村', '城市', '不属于'],
        eventPool: [
          '看到城里人的聚会方式，总觉得格格不入。',
          '想家了，但不想承认自己其实很脆弱。',
          '今天又被同事的某句话刺到了。',
          '看到家乡的朋友结婚了，我还一个人在这。',
        ],
        alwaysVisible: false,
        unlocksAt: {
          trustThreshold: 72,
          requiresQuestion: true,
          triggerTopics: ['hometown', 'village', 'belong', 'lonely'],
        },
      },
    ],
    pixelAvatar: {
      neutral: 'neutral',
      happy: 'happy',
      upset: 'upset',
    },
    initialEmotion: 'neutral',
    dailyEventPool: ['难搞病人', '思念家乡', '梦想碎片', '城市压力', '帮助别人'],
  },
];

export default characters;
