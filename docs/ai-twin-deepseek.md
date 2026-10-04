# AI twin：DeepSeek 配置

2026-10-05：用户已保存 Secrets、执行配额 SQL、部署代理并关闭 JWT 校验。真实问题测试返回 HTTP 200，跨域预检返回 HTTP 204；V4.1 前端 endpoint 已启用。上述检查不替代完整浏览器交互测试。
GitHub Pages 只托管静态页面；DeepSeek 密钥必须放在已有 Supabase 项目的 Edge Function Secrets 中。

## 1. 密钥和服务端

在 DeepSeek 控制台创建 API Key，确保账户可调用 API。不要把密钥发到聊天、写入 JS 或提交到 Git。

在 Supabase 项目 `gvwcfewtubdsqlqxlzbl` 中：

1. SQL Editor 执行 `docs/ai-twin-quota.sql`，创建原子请求配额。仅 service_role 可调用。
2. Edge Functions → Secrets 添加 `DEEPSEEK_API_KEY`。可选 `DEEPSEEK_MODEL=deepseek-flash`。
3. 添加 `AI_TWIN_ALLOWED_ORIGINS=https://xkkkkkkkkkkkkkk.github.io`。
   这是 origin，不能带 `/Personal_website/` 路径。多来源用英文逗号分隔。
4. 创建名为 `ai-twin` 的 Edge Function。网页编辑器部署时，把 `docs/ai-twin-dashboard.ts` 全部复制到编辑器的 `index.ts` 中。这是完整的单文件版本，不需要另外添加 `handler.js`。
   关闭该函数的 JWT verification，因为网站访客无需登录；由函数自身限制来源和持久配额。
5. 部署该函数。平台自动提供 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`，无需把它们写入前端。

如使用已安装并登录的 Supabase CLI，在仓库目录执行：

```powershell
supabase link --project-ref gvwcfewtubdsqlqxlzbl
supabase functions deploy ai-twin --no-verify-jwt
```

密钥推荐在 Dashboard 手动输入，避免出现在命令行历史中。
只有部署这个函数需要关闭 JWT 校验，不要改动反馈表的权限或其他函数。
CLI 部署仍使用 `supabase/functions/ai-twin/` 中的两个源文件。修改服务端源代码后，执行 `node scripts/build-ai-twin-dashboard.mjs` 重新生成网页编辑器版本。

## 2. 启用前端

`js/ai-twin-config.js` 中的 endpoint 已设置为：

```javascript
endpoint: "https://gvwcfewtubdsqlqxlzbl.supabase.co/functions/v1/ai-twin"
```

这个 URL 是公开设置，不是密钥。配置后初始状态显示 ready to connect，首次成功回答后才显示 connected。
留空则使用本地知识库；已配置接口失败时会明确报错，保留问题供重试。
本地 file:// 页面的 origin 为 null，不在允许列表里。联调应在正常 HTTP 预览环境进行，按需要将对应的精确 origin 加入服务端允许列表。
前端和后端准备好、联调通过后，再按用户要求提交和发布网站。

## 3. 行为与限额

- 支持一般问题和多轮问答；个人经历仍仅依据服务端确认的公开资料。
- 单条问题最多 2,000 字符；上下文最多 5 个完整历史问答加当前问题，总计不超过 12,000 字符。
- 每次回复最多 900 tokens，30 秒服务端超时，35 秒前端超时。不自动重试，避免重复计费。
- 同一 IP 哈希每 10 分钟最多 20 次，全站每天 UTC 最多 200 次。失败请求也可能消耗配额；IP 限制拒绝仍会保守计入全站次数。
- 来源校验不能阻止伪造 Origin 的脚本；每日全站配额是费用限制的后盾。它是请求次数上限，不是精确金额上限。
- 数据库只保存配额计数与加盐 IP 哈希，不保存问题和回复。会话只在当前页面内存中保存，刷新清空。
- 提问和必要的历史对话会发送给 DeepSeek。此接入没有联网搜索；模型回答仍可能出错。

## 4. 联调检查

1. 问“解释梯度下降”，再问“给一个 Python 例子”，确认第二问理解上下文。
2. 问 CarbonLens 的目标，以及未提供的实习经历，确认不虚构个人成果。
3. 断开连接测试错误提示、问题恢复和再次发送；快速重复点击只能触发一个请求。
4. 不允许的来源返回 403；错误角色/超长消息返回 400；耗尽配额返回 429；数据库不可用时不调用模型。
5. 浏览器源码和网络请求中应没有 DeepSeek 密钥或 Supabase service role key。

本地模拟测试：`node --test tests/ai-twin.test.mjs`。模拟测试不能替代真实密钥联调，也不验证远程 SQL 的实际执行。

参考官方文档：[DeepSeek Chat API](https://api-docs.deepseek.com/api/create-chat-completion/)、
[模型名称](https://api-docs.deepseek.com/quick_start/pricing/)、
[Supabase Secrets](https://supabase.com/docs/guides/functions/secrets)、
[Supabase 函数鉴权](https://supabase.com/docs/guides/functions/auth)。
