# AI 健身饮食助手 最终短 Prompt

请基于 `Vue 3 + Vite + TypeScript` 开发一个 `AI 健身饮食助手` 单页应用，技术方案必须使用 `vue-ai-modelscope-supabase` 技能的实现方式：

- 前端直接调用 `ModelScope` OpenAI 兼容聊天接口
- 前端直接通过 `Supabase REST` 读写数据
- 使用 `localStorage` 持久化用户设置、模型选择、最近输入和 `sync_id`
- 不做复杂账号系统，使用 `sync_id` 作为跨设备同步标识

## 产品定位

- 主要给我自己使用，但未来也希望其他人可以使用
- 先做 `MVP`
- 中文界面
- 饮食建议和训练计划同等重要

## UI/风格要求

- 风格必须 `极简、克制、非卡片式`
- 不要大面积卡片、厚阴影、炫技仪表盘
- 使用 `分栏布局 + 留白 + 细边框 + 列表/表格 + 分隔线`
- 整体更像专业健康工具，而不是营销页面
- 支持 `浅色模式 / 深色模式 / 跟随系统`
- 桌面端和移动端都要可用

## 页面结构

页面建议分为 4 个区域：

1. 顶部栏
- 产品名 `AI 健身饮食助手`
- 模型切换
- 主题切换
- `sync_id`
- 保存/同步状态

2. 左栏：基础资料
- 性别
- 年龄
- 身高
- 当前体重
- 目标体重
- 目标类型（减脂 / 增肌 / 维持）
- 每周训练天数
- 饮食偏好 / 忌口

3. 中栏：今日输入
- 今日体重
- 今日训练目标
- 今日可训练时长
- 可用器械
- 今日已吃食物或计划食物
- 身体状态（精力、饥饿感、疲劳感）
- 自定义标签输入支持回车添加、按钮添加、去重、去空格

4. 右栏：AI 输出
- 今日热量建议
- 蛋白质 / 碳水 / 脂肪建议
- 今日训练建议
- 今日饮食建议
- 恢复建议
- 风险提醒

5. 历史记录区
- 使用 `简洁表格` 作为主视图，不要时间轴
- 日期倒序
- 字段至少包括：日期、体重、目标类型、热量建议、训练时长、是否已生成建议
- 点击表格行后展开详情

## 功能要求

必须支持：

- 根据用户基础资料和当天状态生成 AI 健身饮食建议
- 保存每日记录到 Supabase
- 通过 `sync_id` 加载历史记录
- 查看某一天的 AI 建议详情
- 自动保存本地表单和设置
- 预留 `拍照识别食物` 的入口和后续扩展位，但 `v1` 不必真正接入图片识别

## ModelScope 要求

使用：

- API Base: `https://api-inference.modelscope.cn/v1`
- 默认模型：`deepseek-ai/DeepSeek-V4-Flash`
- 也支持：
  - `ZhipuAI/GLM-5.1`
  - `nv-community/NVIDIA-Nemotron-3-Super-120B-A12B-FP8`

AI 请求必须要求模型只返回严格 JSON。前端需要：

- 防御性提取 JSON
- 解析失败时显示友好错误
- 对关键字段做校验

请使用类似这样的 JSON 结构：

```json
{
  "summary": "一句话总结",
  "calorie_target": 2200,
  "macros": {
    "protein_g": 160,
    "carbs_g": 220,
    "fat_g": 70
  },
  "training_plan": [
    {
      "title": "上肢力量训练",
      "duration_minutes": 45,
      "steps": ["动作1", "动作2"]
    }
  ],
  "diet_plan": [
    {
      "meal": "午餐",
      "suggestion": "鸡胸肉 + 米饭 + 西兰花"
    }
  ],
  "recovery_tips": ["保证睡眠"],
  "warnings": ["如果疲劳明显请降强度"]
}
```

## Supabase 数据库要求

请重新设计并提供 SQL，至少包含两张表：

1. `user_profiles`
- 保存基础资料
- 用 `sync_id` 唯一标识用户同步身份

2. `daily_records`
- 保存每日输入和 AI 输出
- 与 `sync_id` 关联
- 需要按 `sync_id + record_date` 高效查询

请同时提供：

- 建表 SQL
- 必要索引
- `updated_at` 自动更新方案

## 代码要求

请直接给出完整可运行代码，并尽量保持结构清晰。推荐至少拆分为：

- `src/App.vue`
- `src/types.ts`
- `src/lib/storage.ts`
- `src/lib/modelscope.ts`
- `src/lib/supabase.ts`
- `src/styles.css`

要求：

- 使用 Composition API
- 类型清晰
- 错误提示简洁
- `App.vue` 可以作为主页面承载大部分 UI
- 最终项目必须可运行并通过 `npm run build`

## 交付内容

请一次性输出：

1. 完整项目代码
2. Supabase SQL
3. 环境常量放置方式
4. 运行说明
5. 验证方法

不要只给思路，请直接进入实现。
