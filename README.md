# 关系练习室

> 通过和 AI 角色对话，练习理解、回应、修复和建立信任。

这是一个面向社交练习的 AI 产品原型。它不是心理治疗，也不是单纯的聊天机器人，而是一个低压力的关系练习空间：用户可以在这里尝试开口、倾听、表达边界、处理误会，并看到自己的表达如何影响一段关系。

**Codex 评语：**

> 我真挺喜欢这个产品的。它有一点点温柔的残酷：AI 很宽容，但关系规则不完全宽容。它给你机会重来，但也让你看见自己的表达会造成什么后果。这个张力很有生命力。

线上体验：[social.preview.aliyun-zeabur.cn](https://social.preview.aliyun-zeabur.cn)

## 为什么做

很多人不是不想和世界连接，只是每一次开口都太紧张。

这个产品希望提供一个可以反复练习的地方。AI 不会厌烦用户重复尝试，也不会真的因为一次表达失误而离开；但角色仍然会有情绪、边界和关系反馈。产品不 judge 用户这个人，只反馈用户在关系里的动作。

它也是一个练手和展示型项目，用来探索：

- AI 角色长期记忆
- 关系状态与信任变化
- 动态对话启发
- 冲突和修复设计
- 服务端 AI 代理和部署安全
- 更克制、更像真实产品的 UI 体验

## 当前能力

- 三个可对话角色，每个角色有独立关系状态。
- 信任度、情绪、已了解信息会随对话变化。
- Memory Palace 结构记录长期上下文，让角色能在合适的时候记得过去。
- DeepSeek 调用走服务端 `/api/chat`，避免前端暴露 API key。
- 服务端有来源限制和基础限流。
- 首页、角色选择、聊天、档案页已经统一成简洁的关系练习体验。
- 数据目前保存在浏览器 `localStorage`，无需账号即可使用。

## 产品原则

- 练习关系，而不是完成任务。
- 角色要像人，不像教学 NPC。
- 教学藏在体验里，不做生硬课程弹窗。
- 信息逐步显露，用户通过对话慢慢了解角色。
- 系统能力不外显，让用户感受到关系在变化即可。

## 后续方向

近期会优先打磨核心聊天体验：

- **动态聊天启发**：根据当前对话、情绪和关系状态生成更贴合的接话建议。
- **冲突与修复系统**：让误会、冷淡、冒犯和道歉形成可练习的关系路径。
- **信任 milestone**：把信任度从数字变成更清楚的关系阶段和探索动力。
- **Memory Palace 深化**：更细地控制何时记、何时提、如何自然提起。
- **首页日常练习流**：让用户打开后知道今天适合练什么。
- **语音输入**：降低表达成本，让练习更接近真实说话。

更完整的规划见 [PRODUCT_OPTIMIZATION_PLAN.md](PRODUCT_OPTIMIZATION_PLAN.md)。

## 本地开发

安装依赖：

```bash
npm install
```

配置本地环境变量：

```bash
cp .env.example .env.local
```

在 `.env.local` 中填写：

```bash
DEEPSEEK_API_KEY=your-deepseek-api-key-here
```

如果只看前端 UI：

```bash
npm run dev
```

如果要完整测试 `/api/chat`：

```bash
npm run build
npm run start
```

默认服务地址：

- Vite 前端开发：`http://localhost:5173`
- Express 完整服务：`http://localhost:3000`

## 技术栈

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- React Router
- Express / Vercel Functions
- DeepSeek v4-flash

## 项目结构

```text
src/
├── pages/          # Home / Characters / Chat / Profile
├── components/     # PixelAvatar / ChatBubble 等 UI 组件
├── data/           # 角色与练习内容
├── engine/         # prompt、信任度、记忆、启发生成等核心逻辑
├── store/          # Zustand 状态和 localStorage 持久化
└── types/          # TypeScript 类型

api/chat.ts         # Vercel Function 版本的服务端代理
server.ts           # Zeabur/本地 Express 服务
```

## 部署

生产环境需要设置：

```bash
DEEPSEEK_API_KEY=your-deepseek-api-key-here
ALLOWED_ORIGINS=https://your-domain.example
```

Zeabur 使用 `server.ts` 托管前端静态资源和 `/api/chat`。Vercel 使用 `api/chat.ts` 作为 Serverless Function。

## 说明

这个项目仍在快速迭代中。它目前更适合作为产品原型、作品集项目和关系练习实验，不应被描述为医疗、心理治疗或专业咨询工具。
