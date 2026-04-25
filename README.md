# AI 健身饮食助手

一个基于 `Vue 3 + Vite + TypeScript` 的 AI 健身饮食助手，前端直接调用 `ModelScope`，并通过 `Supabase REST` 保存用户资料和每日记录。

## 技术栈

- Vue 3
- Vite
- TypeScript
- ModelScope chat completions
- Supabase REST
- localStorage 本地持久化

## 环境变量

复制 `.env.example` 为 `.env.local`，如需替换服务地址或密钥可自行修改：

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

如果不提供环境变量，项目会回退到技能中给定的默认配置。

## Supabase 初始化

1. 在 Supabase SQL Editor 中执行 [supabase.sql](C:\Users\huazh\Desktop\xiangmu\ai-fitness-diet-assistant\supabase.sql)
2. 确认已经创建：
   - `user_profiles`
   - `daily_records`
3. 确认表的 RLS 策略已启用

## 运行方式

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

## 主要文件

- [src/App.vue](C:\Users\huazh\Desktop\xiangmu\ai-fitness-diet-assistant\src\App.vue)
- [src/types.ts](C:\Users\huazh\Desktop\xiangmu\ai-fitness-diet-assistant\src\types.ts)
- [src/lib/modelscope.ts](C:\Users\huazh\Desktop\xiangmu\ai-fitness-diet-assistant\src\lib\modelscope.ts)
- [src/lib/supabase.ts](C:\Users\huazh\Desktop\xiangmu\ai-fitness-diet-assistant\src\lib\supabase.ts)
- [src/lib/storage.ts](C:\Users\huazh\Desktop\xiangmu\ai-fitness-diet-assistant\src\lib\storage.ts)
- [src/styles.css](C:\Users\huazh\Desktop\xiangmu\ai-fitness-diet-assistant\src\styles.css)

## 验证建议

1. 首次打开页面后，确认本地自动生成了 `sync_id`
2. 修改基础资料并点击“同步资料”，确认 `user_profiles` 有数据
3. 填写今日输入并点击“生成建议”，确认右栏能显示结构化结果
4. 点击“保存记录”，确认 `daily_records` 中新增或更新当天记录
5. 用同一个 `sync_id` 在另一台设备打开，点击“刷新记录”，确认历史能回读

## 备注

- 当前已预留“拍照识别食物”入口，`v1` 先以备注形式保存
- 深色模式支持跟随系统，也支持手动切换
- 历史记录采用简洁表格 + 详情展开，而不是时间轴
