# ai-saler

一个轻量的 LLM 聊天网页。

## 功能

- Fetch + SSE + ReadableStream 流式解析
- 会话/消息管理（Pinia + localStorage）
- 上下文裁剪、停止与中断续写
- 虚拟列表 + 懒加载，流式更新用 rAF 缓冲
- Web Vitals + 流式指标采集与批量上报

## 快速开始

1. 复制环境变量文件
   - `env.example.txt` -> `.env.local`（或 `.env`）
2. 填写必要变量
   - `VITE_OPENAI_COMPAT_BASE_URL`
   - `VITE_OPENAI_COMPAT_API_KEY`
   - `VITE_OPENAI_MODEL`
3. 安装依赖并启动

```sh
npm install
npm run dev
```
