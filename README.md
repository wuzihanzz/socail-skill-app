# 社交技能修炼 🚀

> 通过和真实的AI角色聊天，学习如何更好地与他人沟通。

一个创新的社交技能学习平台，结合**像素艺术头像**、**信任度系统**和**AI角色扮演**，让用户在真实的对话中提升社交能力。

![社交技能修炼](https://img.shields.io/badge/Status-Active-green) ![React](https://img.shields.io/badge/React-19-blue) ![Vite](https://img.shields.io/badge/Vite-8-purple) ![TypeScript](https://img.shields.io/badge/TypeScript-6-blue)

---

## ✨ 核心特性

### 📚 社交技巧中心
- 10+条精心设计的社交技巧卡片
- 分类覆盖：主动倾听、同理心、冲突化解、表达感谢、读懂情绪
- 每条技巧配有真实场景示例

### 🎭 AI角色聊天
与三个各具特色的虚拟角色进行深度对话：

| 角色 | 职业 | 性格 | 特点 |
|------|------|------|------|
| **陈威** 🧑‍⚖️ | 律师 | INFP | 工作狂、家庭压力、深层不安全感 |
| **林雪** 👩‍🎨 | 设计师 | ENFP | 创意天才、感情焦虑、完美主义 |
| **小美** 👩‍⚕️ | 护士 | ISFJ | 照顾者、隐藏梦想、思乡情结 |

### 💫 智能信任系统
- **动态信任度**：根据用户的表达质量实时调整（范围 0%-100%）
- **情绪反馈**：角色根据对话质量改变表情（开心 😊 / 中立 😐 / 不满 😠）
- **技能解锁**：达到信任度阈值，解锁角色的深层故事和心理状态
- **加权判断**：结合keyword分析（40%）和LLM判断（60%）

### 🎨 像素艺术风格
- **CSS纯手绘**的像素头像，每个字符16×16像素网格
- **三种表情状态**：neutral（中立）、happy（开心）、upset（不满）
- **平滑动画过渡**，增强视觉反馈

### 🎯 对话建议系统
- 实时分析AI角色的最后一条消息
- 生成3条**情景式建议**，帮助用户选择更好的回应
- 无需思考，直接学习有效的沟通技巧

### 💾 本地进度保存
- 所有角色的对话历史、信任度、已解锁技能存储在浏览器localStorage
- 关闭网站后，下次打开时进度完整保留

---

## 🛠 技术栈

### 前端
- **React 19** - UI框架
- **Vite 8** - 极速构建工具
- **TypeScript 6** - 类型安全
- **React Router 7** - 页面路由
- **Zustand 5** - 轻量级状态管理
- **CSS Modules** - 作用域样式

### 后端/AI
- **Vercel Functions** - 无服务器后端
- **DeepSeek API (v4-flash)** - AI对话引擎
- **Anthropic SDK** - 本地开发用

### 部署
- **Vercel** - 全球CDN，自动部署
- **pnpm** - 高效包管理器

---

## 🚀 快速开始

### 本地开发

```bash
# 1. Clone项目
git clone https://github.com/wuzihanzz/socail-skill-app.git
cd socail-skill-app

# 2. 安装依赖
pnpm install

# 3. 创建 .env.local 文件（可选，用于本地直接调用Claude）
echo "VITE_ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE" > .env.local

# 4. 启动开发服务器
pnpm dev

# 5. 打开浏览器
# http://localhost:5173
```

### 生产部署 (Vercel)

1. **关联GitHub**：在Vercel Dashboard中连接你的GitHub仓库
2. **配置环境变量**：
   - `DEEPSEEK_API_KEY` - DeepSeek API密钥
3. **自动部署**：每次push到main分支自动部署

---

## 📋 项目结构

```
social-skill-app/
├── src/
│   ├── pages/
│   │   ├── Home.tsx          # 🏠 社交技巧中心
│   │   ├── Characters.tsx    # 🎭 角色选择页面
│   │   ├── Chat.tsx          # 💬 聊天界面
│   │   └── Profile.tsx       # 👤 角色档案卡（抽屉）
│   ├── components/
│   │   ├── PixelAvatar.tsx   # 🎨 像素艺术头像
│   │   ├── TrustBar.tsx      # 📊 信任度/满意度条形图
│   │   ├── ChatBubble.tsx    # 💭 聊天气泡
│   │   └── CharacterCard.tsx # 📇 角色卡片
│   ├── engine/
│   │   ├── trustEngine.ts    # 💯 信任度计算
│   │   ├── skillEngine.ts    # 🔓 技能解锁逻辑
│   │   ├── promptBuilder.ts  # 🤖 AI系统提示词构建
│   │   ├── eventGenerator.ts # 📅 日常事件生成
│   │   ├── conversationHelper.ts # 💡 对话建议生成
│   │   └── claudeClient.ts   # 🌐 API调用（支持本地代理）
│   ├── store/
│   │   └── gameStore.ts      # 🎮 Zustand全局状态
│   ├── data/
│   │   ├── characters.ts     # 👥 角色配置与技能定义
│   │   └── tips.ts           # 📚 社交技巧内容
│   └── types/index.ts        # 📝 TypeScript类型定义
├── api/
│   └── chat.ts               # ⚙️ Vercel API路由
└── package.json
```

---

## 💡 核心机制

### 信任度系统工作流程

```
用户输入 → 前端分析（keywords）→ LLM判断（satisfactionDelta）
   ↓
加权计算（40% + 60%）→ 信任度变化
   ↓
更新表情、解锁技能、触发事件
```

### 技能解锁规则

- **Always Visible（总是可见）**：角色的基本特征（如"工作狂"、"创意天才"）
- **信任度阈值**：达到一定信任度后解锁更深层秘密
- **自动检测**：当AI响应中出现人物信息（名字、星座、MBTI等），自动标记为已提及

### 短消息策略

角色回复严格遵循"1-2句短消息"规则，用 `\n\n` 分隔多条，模拟真实对话节奏：

```
你说得有点模糊啊

我没太听明白
```

---

## 🎯 学习成效

通过与虚拟角色的对话，用户学习到：

✅ **同理心表达** - 识别他人情绪，给予共鸣  
✅ **主动倾听** - 提出开放性问题，深入了解  
✅ **情绪管理** - 理解不同性格对压力的反应  
✅ **冲突化解** - 用温和的语气处理分歧  
✅ **表达感谢** - 真诚认可他人的努力  

---

## 🔧 配置

### 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API密钥（生产） | `sk-...` |
| `VITE_ANTHROPIC_API_KEY` | Claude API密钥（本地开发） | `sk-ant-...` |
| `VITE_ANTHROPIC_BASE_URL` | Claude代理地址（可选） | `http://localhost:8000` |

### 支持的模型

- **生产**：DeepSeek v4-flash（高效、低成本）
- **本地**：Claude Haiku 4.5（高质量、适合测试）

---

## 📊 性能指标

| 指标 | 数值 |
|------|------|
| 首屏加载 | < 1s |
| 构建体积 | 275 kB (JS) + 16 kB (CSS) |
| API响应 | ~1-2s |
| 本地保存 | localStorage + Zustand |

---

## 🎓 使用场景

👥 **社交焦虑患者** - 在安全环境中练习对话  
📚 **学生** - 学习人际关系管理  
💼 **职场人士** - 改进沟通技巧  
🌍 **语言学习者** - 通过自然对话学习表达  

---

## 🤝 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 贡献想法
- 🎭 新增角色或故事线
- 🎨 改进像素艺术风格
- 📚 扩展社交技巧库
- 🐛 报告问题和建议

---

## 📄 许可

MIT License - 详见 [LICENSE](LICENSE)

---

## 🙏 致谢

- [Anthropic](https://anthropic.com) - Claude AI
- [DeepSeek](https://deepseek.com) - 高效LLM
- [Vercel](https://vercel.com) - 部署平台
- 所有贡献者和用户的支持

---

## 📞 联系方式

- 🐛 [Issue Tracker](https://github.com/wuzihanzz/socail-skill-app/issues)
- 💬 [讨论区](https://github.com/wuzihanzz/socail-skill-app/discussions)
- 📧 有问题？提交Issue告诉我们

---

<div align="center">

**如果这个项目对你有帮助，请给我一个 ⭐ Star！**

Made with ❤️ by [Zihan Wu](https://github.com/wuzihanzz)

</div>
