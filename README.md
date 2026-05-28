# 社交技能修炼

> 通过和 AI 角色聊天，练习如何更好地与人沟通。

一个基于对话的社交练习应用。每个虚拟角色都有独立的成长背景、性格与社交倾向，你的沟通方式会影响他们对你的态度。

![Status](https://img.shields.io/badge/Status-Active-green) ![React](https://img.shields.io/badge/React-19-blue) ![Vite](https://img.shields.io/badge/Vite-8-purple) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

**线上体验**：

- 🇨🇳 国内访问（推荐）：[social.preview.aliyun-zeabur.cn](https://social.preview.aliyun-zeabur.cn)
- 🌍 海外访问：[socail-skill-app-nlaw.vercel.app](https://socail-skill-app-nlaw.vercel.app)

---

## 功能

### AI 角色对话

三个有完整背景故事的角色，不是简单的聊天机器人：

| 角色 | 职业 | MBTI | 特点 |
|------|------|------|------|
| **陈威**（熬夜的猫） | 律师 | INFP | 中产独生子，父母控制欲强，工作狂，不喝酒 |
| **林雪**（晚风知我） | 设计师 | ENFP | 工薪家庭，从小城镇来，社交场合偶尔喝酒 |
| **小美**（人间烟火） | 护士 | ISFJ | 农村出身，家境贫困，温暖父母，从不喝酒 |

每个角色都有：
- **家庭背景**：出身、父母态度、成长环境、关键经历
- **社交特质**：外向程度、冲突处理方式、依恋风格、饮酒习惯
- **隐藏信息**：随信任度逐步解锁的深层故事

### 信任系统

- 信任度范围 0–100%，根据你的沟通质量实时变化
- 加权计算：关键词分析（40%）+ AI 判断（60%）
- `satisfactionDelta` 1–5 反映角色的实际感受（1=冒犯，3=正常，5=感动）
- 角色有底线：贬低、冷嘲热讽会引发真实反弹，不是无限包容的树洞

### 对话机制

- AI 回复以**短句数组**形式返回，逐条展示，模拟真实聊天节奏
- 角色情绪（neutral / happy / upset）影响回复风格
- 每日随机事件系统，让角色有当天的心情背景
- 对话建议：实时分析 AI 最后一条消息，推荐 3 条回复思路

### 其他

- 像素艺术头像，三种表情状态切换
- 所有数据存储在 `localStorage`，无账户系统，完全本地
- 移动端和桌面浏览器均可使用

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 8 |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand 5 |
| 路由 | React Router 7 |
| AI 模型 | DeepSeek v4-flash |
| 后端 | Express(Zeabur)/ Vercel Functions |
| 部署 | Zeabur(国内)/ Vercel(海外) |

---

## 本地开发

```bash
# 1. Clone
git clone https://github.com/wuzihanzz/socail-skill-app.git
cd socail-skill-app

# 2. 安装依赖
npm install

# 3. 配置 DeepSeek API Key（本地直连，不走 Vercel Function）
echo "VITE_DEEPSEEK_API_KEY=sk-your-key-here" > .env.local

# 4. 启动
npm run dev
# → http://localhost:5173
```

`.env.local` 中的 `VITE_DEEPSEEK_API_KEY` 只用于本地开发模式（`MODE === 'development'`），会直接调用 DeepSeek API。生产环境通过 Vercel Function 中的 `DEEPSEEK_API_KEY` 服务端变量调用，API Key 不会暴露在前端。

### 生产部署

**Vercel（海外）**

1. 在 Vercel Dashboard 连接 GitHub 仓库
2. 添加环境变量 `DEEPSEEK_API_KEY`
3. 每次 push 到 `main` 分支自动部署,使用 `api/chat.ts` 作为 Serverless Function

**Zeabur（国内）**

1. 在 Zeabur 控制台导入 GitHub 仓库
2. 添加环境变量 `DEEPSEEK_API_KEY`
3. 自动识别 `Dockerfile` / `zeabur.json`,构建后由 `server.ts`(Express)同时托管前端静态资源和 `/api/chat` 接口

---

## 项目结构

```
src/
├── pages/
│   ├── Home.tsx           # 社交技巧中心
│   ├── Characters.tsx     # 角色选择
│   ├── Chat.tsx           # 聊天界面
│   └── Profile.tsx        # 角色档案
├── components/
│   ├── PixelAvatar.tsx    # 像素头像（含情绪切换）
│   ├── ChatBubble.tsx     # 聊天气泡
│   └── TrustBar.tsx       # 信任度进度条
├── engine/
│   ├── promptBuilder.ts   # 系统提示词构建（含角色背景注入）
│   ├── trustEngine.ts     # 信任度计算
│   ├── skillEngine.ts     # 技能解锁逻辑
│   ├── claudeClient.ts    # API 调用（本地 DeepSeek / 生产 Vercel）
│   ├── eventGenerator.ts  # 每日事件生成
│   └── conversationHelper.ts  # 对话建议
├── store/
│   └── gameStore.ts       # Zustand 全局状态 + localStorage 持久化
├── data/
│   ├── characters.ts      # 角色配置（含背景、技能、场所偏好）
│   └── tips.ts            # 社交技巧内容
└── types/index.ts         # 类型定义（含 FamilyBackground、VenuePreferences、SocialTendency）
api/
└── chat.ts                # Vercel Function(服务端 API 代理)
server.ts                  # Express 服务器(Zeabur 部署用,同时托管 dist/ 与 /api/chat)
Dockerfile                 # Zeabur 容器构建
zeabur.json                # Zeabur 构建/启动配置
```

---

## 角色数据模型

角色除了基础信息（名字、职业、MBTI 等），还包含三个扩展字段，为未来的场景系统奠基：

```typescript
// 成长背景 → 塑造性格根源
interface FamilyBackground {
  wealth: 'poor' | 'working-class' | 'middle-class' | 'wealthy' | 'rich';
  parentalAttitude: 'warm' | 'strict' | 'absent' | 'controlling' | 'supportive';
  growthEnvironment: 'rural' | 'small-town' | 'suburban' | 'urban';
  siblingCount: number;
  keyFormativeEvent?: string;
}

// 场所偏好 → 决定角色会出现在哪里
interface VenuePreferences {
  frequents: VenueType[];  // 常去场所
  avoids: VenueType[];     // 回避场所
}

// 社交特质 → 影响对话方式
interface SocialTendency {
  extroversion: 1 | 2 | 3 | 4 | 5;
  trustsEasily: boolean;
  conflictStyle: 'avoids' | 'confronts' | 'deflects';
  attachmentStyle: 'secure' | 'anxious' | 'avoidant';
  drinkingHabit: 'never' | 'rarely' | 'socially' | 'regularly';
}
```

---

## 下一步计划

- **场景系统**：酒吧、咖啡馆、书店等场景，角色根据 `VenuePreferences` 决定是否出现
- **更多角色**：目标 5–10 个，覆盖不同社交挑战类型（高冷型、话痨型、被动攻击型等）
- **信任度反馈 Toast**：让用户清楚看到每句话对信任度的影响
- **角色形象升级**：从 CSS 像素画迁移到 SVG 插画

详见 [ROADMAP.md](ROADMAP.md)

---

## 许可

MIT License

---

<div align="center">

Made with ❤️ by [Zihan Wu](https://github.com/wuzihanzz)

</div>
