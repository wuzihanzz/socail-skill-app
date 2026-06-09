# Zeabur 部署

本项目采用同一个 Zeabur Project 内的两个服务：

- Web Service：React 页面、匿名身份、DeepSeek 代理和状态 API。
- PostgreSQL：用户画像、角色关系、聊天记录和长期记忆。

## 1. 添加 PostgreSQL

在当前 Zeabur Project 中选择 `Add Service`，从 Marketplace 添加 PostgreSQL。

数据库不需要公开域名。Web Service 会通过 Zeabur Private Networking 访问数据库。

## 2. 配置 Web Service

在 Web Service 的 Variables 中添加：

```env
DEEPSEEK_API_KEY=你的-DeepSeek-Key
DATABASE_URL=${POSTGRES_CONNECTION_STRING}
COOKIE_SECRET=至少32位的随机字符串
```

PostgreSQL 服务实际暴露的连接变量名称可能不同。可在数据库服务的 Variables 页面复制完整连接字符串，再通过 Zeabur 的 `${变量名}` 引用。

`COOKIE_SECRET` 必须长期保持不变。修改它会使已有用户的匿名身份 Cookie 失效。

可选配置：

```env
ALLOWED_ORIGINS=https://你的正式域名
CHAT_RATE_LIMIT_MAX=12
CHAT_RATE_LIMIT_WINDOW_MS=60000
CHAT_DAILY_LIMIT=200
CHAT_DAILY_IP_LIMIT=300
DATABASE_POOL_SIZE=5
```

同项目的 `*.zeabur.internal` PostgreSQL 默认使用私有网络，不需要开启 TLS。其他数据库如需关闭 TLS，可显式设置：

```env
DATABASE_SSL=false
```

## 3. 自动建表

服务启动时会自动创建：

- `app_users`
- `user_states`
- `daily_usage`
- `daily_ip_usage`

建表 SQL 也保存在 `database/schema.sql`，方便手动检查。

## 4. 身份机制

用户首次访问时，服务器会：

1. 创建随机 UUID。
2. 使用 `COOKIE_SECRET` 签名。
3. 写入 `HttpOnly + Secure + SameSite=Lax` Cookie。
4. 将用户状态保存到 PostgreSQL。

前端 JavaScript 无法读取或伪造身份 Cookie。用户未来绑定邮箱、微信或其他登录方式时，应继续沿用这个 UUID，不需要迁移关系数据。

## 5. 本地运行

不配置 `DATABASE_URL` 时，服务会使用进程内存保存状态，适合页面调试：

```bash
npm install
npm run build
npm run start
```

进程重启后内存状态会消失。需要测试真实持久化时，请在 `.env.local` 或终端环境变量中提供 PostgreSQL `DATABASE_URL` 和稳定的 `COOKIE_SECRET`。

## 安全边界

- DeepSeek Key 只允许放在 Web Service 环境变量中。
- PostgreSQL 不要暴露公网端口。
- `/api/chat` 同时按用户和 IP 限流，并有用户及 IP 每日调用上限。
- IP 只以加盐哈希形式用于额度统计，不保存原始地址。
- 所有状态写入都校验请求来源和签名身份。
