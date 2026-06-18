# Zeabur Postgres 配置说明

## 需要的权限或信息

如果要由 Codex 直接配置线上环境，需要至少一种方式：

- Zeabur Dashboard 可操作权限，手动把下面环境变量填进服务。
- 或 Zeabur API token / CLI 登录态，让自动化脚本可以修改 `service-69fb0ae4e1f16f058631461a` 的环境变量。

仅有 service id 不足以修改线上配置，因为还缺少鉴权。

## 必填环境变量

```env
DATABASE_URL=postgresql://...
COOKIE_SECRET=replace-with-at-least-32-random-characters
DEEPSEEK_API_KEY=your-deepseek-api-key
ALLOWED_ORIGINS=https://your-domain.example.com,http://localhost:5173,http://localhost:3000
```

## Zeabur Postgres 建议

- 如果 Web 服务和 Postgres 服务在同一个 Zeabur 项目内，优先使用 Zeabur 提供的内网连接串。
- 内网连接串通常包含 `zeabur.internal`，当前后端会自动关闭 TLS。
- 如果使用公网连接串，生产环境默认会开启 `rejectUnauthorized: false` 的 TLS 连接方式。

## 验证方式

1. 部署后打开登录页。
2. 如果页面出现“临时内存存储”提示，说明 `DATABASE_URL` 没有生效。
3. 注册账号后重启服务。
4. 重新登录同一账号，如果关系进度仍在，说明 Postgres 持久化成功。
5. 聊天中告诉角色一个偏好，再刷新/重登后追问，确认 `memory_entries` 检索生效。

## 当前数据库表

- `app_users`
- `auth_accounts`
- `user_states`
- `daily_usage`
- `daily_ip_usage`
- `memory_entries`
