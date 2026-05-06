# Vercel 部署指南

本项目采用了后端API代理架构，用户不需要配置自己的API密钥。

## 部署步骤

### 第1步：推送代码到GitHub

```bash
# 如果还没有初始化Git
git init
git add .
git commit -m "Initial commit: social skill app with API backend"

# 添加GitHub远程仓库（替换你的用户名）
git remote add origin https://github.com/你的用户名/social-skill-app.git

# 推送到GitHub
git branch -M main
git push -u origin main
```

### 第2步：在Vercel上部署

1. 访问 https://vercel.com
2. 点击 "Sign Up" → 选择 "GitHub" 登录
3. 授权Vercel访问你的GitHub账户
4. 点击 "Add New..." → "Project"
5. 选择 `social-skill-app` 仓库
6. 点击 "Import"

### 第3步：配置环境变量

在Vercel项目设置中，找到 "Environment Variables" 部分，添加以下两个变量：

| 名称 | 值 | 说明 |
|------|-----|------|
| `ANTHROPIC_API_KEY` | 你的API密钥 | 从 `ada-cli-golang.ctripcorp.com` 获取 |
| `ANTHROPIC_BASE_URL` | `http://ada-cli-golang.ctripcorp.com` | Claude API端点 |

### 第4步：完成部署

- 点击 "Deploy"
- 等待1-3分钟
- 获得 `*.vercel.app` 链接

---

## 本地开发

### 运行本地开发服务器

```bash
npm install
npm run dev
```

本地开发时使用 `.env.local` 中的API密钥直接调用Claude API（用于测试）。

### 构建生产版本

```bash
npm run build
npm run preview
```

---

## 用户使用

1. 朋友们访问你的Vercel链接
2. 无需配置任何API密钥
3. 直接开始聊天！

所有API调用都通过你的后端处理，你的API密钥完全保护。

---

## 成本说明

- 每次聊天都会消耗**你的** Claude API额度
- 如果担心成本，可以在Vercel项目设置中配置访问限制

---

## 故障排除

### 部署失败

检查环境变量是否正确设置：
- `ANTHROPIC_API_KEY` 不能为空
- `ANTHROPIC_BASE_URL` 必须包含完整的协议 (`http://` 或 `https://`)

### 聊天报错

检查Vercel的Function Logs：
- 项目 → Deployments → 选择最新部署 → Function Logs
- 查看是否有环境变量或API连接问题

---

完成！🎉 你现在可以邀请朋友们使用了。
