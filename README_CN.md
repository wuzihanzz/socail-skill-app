# 社交技能修炼 - Social Skill Improve

一个通过和AI角色聊天来学习社交技能的交互式网站。

## 特性

✨ **Skill解锁系统** - 与角色互动时逐步解锁他们的故事和秘密
🎨 **像素艺术头像** - 用CSS绘制的三个不同角色，有不同的情绪表达
💬 **动态对话** - 由Claude API驱动，角色会根据你的互动改变态度
📊 **信任度系统** - 你的沟通方式会影响角色对你的看法
📚 **社交技巧** - 10个实用的沟通技巧可以在首页学习

## 快速开始

### 1. 安装

```bash
npm install
```

### 2. 配置API Key

复制 `.env.example` 到 `.env.local`：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 并添加你的Claude API Key：

```
VITE_ANTHROPIC_API_KEY=sk-ant-YOUR_API_KEY_HERE
VITE_ANTHROPIC_BASE_URL=https://api.anthropic.com
```

如果使用自定义baseURL（如第三方代理），修改 `VITE_ANTHROPIC_BASE_URL`：

```
VITE_ANTHROPIC_BASE_URL=https://your-proxy.example.com
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5174` 开始使用。

## 角色介绍

### 陈威 (Chen Wei) - 律师
- **MBTI:** INFP | **星座:** 双子座 | **年龄:** 28
- **特质：** 工作狂 → 家庭期望 → 深层不安全感
- 表面专业，内心充满焦虑

### 林雪 (Lin Xue) - 设计师
- **MBTI:** ENFP | **星座:** 天蝎座 | **年龄:** 26
- **特质：** 创意天才 → 感情焦虑 → 完美主义压力
- 外表热情，内心敏感

### 小美 (Xiao Mei) - 护士
- **MBTI:** ISFJ | **星座:** 处女座 | **年龄:** 24
- **特质：** 照顾者 → 隐藏梦想 → 乡愁
- 温柔体贴，容易被忽视

## 系统工作原理

### 1. 信任度系统

每条消息后，系统分析你的话语质量：

- **✅ 正面信号**（+5 ~ +12）
  - 表示同理和理解
  - 主动询问和倾听
  - 承认错误和道歉
  - 分享个人经历

- **❌ 负面信号**（-5 ~ -15）
  - 批评和指责
  - 忽视感受
  - 冷淡和无所谓
  - 伤人的言辞

### 2. Skill解锁

角色有多层特质：

```
级别 1: 表面信息（始终可见）
  - 职业、星座、年龄

级别 2: 工作相关特质（信任>30%)
  - 通过日常对话自然提及

级别 3: 深层背景（信任>50~70%)
  - 当用户表现出同理心时解锁

级别 4: 最脆弱秘密（信任>70~80%)
  - 需要高质量的情感连接
```

### 3. 每日事件

每个对话会随机生成一个日常事件（加班、失恋、成功等），注入到AI的回应中。这让对话感觉更真实。

## 项目结构

```
src/
├── pages/          # 页面组件
│   ├── Home.tsx    # Tips首页
│   ├── Characters.tsx  # 角色选择
│   └── Chat.tsx    # 聊天界面
├── components/     # UI组件
│   ├── PixelAvatar.tsx
│   ├── TrustBar.tsx
│   ├── ChatBubble.tsx
│   └── CharacterCard.tsx
├── data/           # 静态数据
│   ├── characters.ts
│   └── tips.ts
├── engine/         # 核心逻辑
│   ├── promptBuilder.ts
│   ├── trustEngine.ts
│   ├── skillEngine.ts
│   ├── eventGenerator.ts
│   └── claudeClient.ts
└── store/          # 状态管理
    └── gameStore.ts
```

## 技术栈

- **React 18** + TypeScript
- **Vite** - 极快的构建工具
- **React Router** - 页面导航
- **Zustand** - 轻量级状态管理
- **Anthropic SDK** - Claude API调用
- **CSS** - 像素艺术头像

## 自定义baseURL

如果使用第三方代理或自托管Claude API，修改 `.env.local`：

```
VITE_ANTHROPIC_BASE_URL=https://api.your-provider.com
```

系统会自动使用这个URL而不是官方的Anthropic API。

---

由Claude Code创建 ✨
