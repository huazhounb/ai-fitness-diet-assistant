# AI 健身饮食助手 Prompt（v1）

## 产品方向

我要做一个 `AI 健身饮食助手` 小工具，技术必须使用：

- `Vue 3 + Vite + TypeScript`
- 前端直接调用 `ModelScope` OpenAI 兼容聊天接口
- 前端直接通过 `Supabase REST` 存储和读取数据
- 使用本地 `localStorage` 保存用户选择、模型选择和 `sync_id`

这个项目是一个单页应用，优先做 `MVP`。产品定位是 `主要自己使用，但未来也可以给其他人使用`，所以信息结构和数据结构要具备一定通用性，但 `v1` 不做复杂账号体系。数据库可以重新创建，使用 `sync_id` 作为跨设备同步标识。

## 设计要求

- 整体风格：`极简、克制、清爽`
- 明确要求：`不要卡片式设计`
- 布局方向：使用 `分栏布局`、`留白`、`细边框分隔`、`淡色背景分区`
- 避免大面积圆角卡片、厚阴影、花哨渐变、仪表盘式堆砌
- 界面以 `文本层级 + 分隔线 + 表格/列表 + 简洁按钮` 为主
- 默认中文界面
- 必须支持 `浅色 / 深色` 双主题，默认跟随系统，也允许用户手动切换
- 同时兼顾桌面端和移动端

## 目标功能

请你帮我直接实现一个可运行的前端项目，核心功能包括：

1. 用户基础信息设置
- 性别
- 年龄
- 身高
- 当前体重
- 目标体重
- 目标类型（减脂 / 增肌 / 维持）
- 每周训练天数
- 饮食偏好或忌口

2. 每日输入
- 今日体重
- 今日训练目标
- 今日可训练时长
- 可用器械
- 今日已吃食物或计划吃的食物
- 当前身体状态（精力、饥饿感、疲劳感）

3. AI 生成结果
- 今日热量建议
- 蛋白质 / 碳水 / 脂肪建议
- 今日训练建议
- 今日饮食建议
- 风险提醒或恢复建议
- 输出必须为结构化 JSON，前端要做健壮解析和校验

4. 数据保存与同步
- 保存每日记录到 Supabase
- 支持通过 `sync_id` 读取历史记录
- 历史记录按日期倒序展示
- 可以查看某天的训练与饮食建议结果

5. 后续扩展预留
- 预留 `拍照识别食物` 的界面入口和数据结构扩展位
- `v1` 可以先不真正接入图片识别模型，但要在结构上方便以后添加

5. 本地持久化
- 保存用户基础信息
- 保存最近一次输入内容
- 保存所选模型
- 保存 `sync_id`

## 推荐页面结构

请采用非卡片式结构，建议页面划分为：

### 顶部
- 左侧显示产品名：`AI 健身饮食助手`
- 右侧显示模型切换、同步标识、保存状态

### 左栏：基础资料
- 用户基础信息表单
- 目标设置
- 饮食偏好设置

### 中栏：今日输入
- 当日身体与训练输入
- 食物输入
- 自定义标签输入（训练重点、器械、忌口）

### 右栏：AI 输出
- 今日热量与宏量营养建议
- 今日训练计划
- 今日饮食建议
- 恢复与提醒

### 底部或独立区域：历史记录
- 使用 `简洁表格` 作为主展示
- 表格字段至少包含：日期、体重、目标类型、热量建议、训练时长、是否已生成 AI 建议
- 点击某条记录后，在侧边或下方展开详情
- 不使用时间轴作为默认主视图

## 视觉规范

请按以下风格实现样式：

- 使用 CSS 变量定义颜色、边框、间距、字号
- 以浅灰、米白、黑灰文字为主，少量绿色作为健康状态强调色
- 按钮简洁，避免胶囊卡片感
- 输入框、分区、列表使用细边框和轻背景，不使用投影
- 标题层级清晰，字体尽量现代、简洁、偏内容型
- 通过网格、分栏、分隔线营造秩序感，而不是靠卡片堆叠
- 深色主题不要做成高饱和霓虹风，依然保持克制、低对比、偏内容工具感

## 技术要求

请严格按下面的技术要求实现：

- 使用 `Vue 3 + Vite + TypeScript`
- 优先使用 Composition API
- 初版可以主要放在 `App.vue`
- AI 调用使用 `fetch` 请求 `https://api-inference.modelscope.cn/v1/chat/completions`
- 默认模型使用 `deepseek-ai/DeepSeek-V4-Flash`
- 保留模型切换能力，也支持：
  - `ZhipuAI/GLM-5.1`
  - `nv-community/NVIDIA-Nemotron-3-Super-120B-A12B-FP8`
- 前端直接通过 Supabase REST API 进行增删改查
- 类型定义清晰，拆分接口类型、AI 返回类型、持久化记录类型
- 对 AI 返回做防御性 JSON 提取与解析
- 错误提示要简洁友好
- `localStorage` 持久化必须完整
- 自定义标签输入支持回车添加、按钮添加、去重、去空格
- 主题模式需要支持：
  - 跟随系统
  - 手动切换浅色模式
  - 手动切换深色模式
- 最终必须可以运行并通过 `npm run build`

## 数据库设计

请直接给出 Supabase SQL 建表语句，重新新建以下两张表：

### `user_profiles`
- `id uuid primary key default gen_random_uuid()`
- `sync_id text not null unique`
- `nickname text`
- `sex text`
- `age integer`
- `height_cm numeric`
- `current_weight_kg numeric`
- `target_weight_kg numeric`
- `goal text`
- `training_days_per_week integer`
- `diet_preferences jsonb not null default '[]'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `daily_records`
- `id uuid primary key default gen_random_uuid()`
- `sync_id text not null`
- `record_date date not null`
- `weight_kg numeric`
- `training_goal text`
- `duration_minutes integer`
- `equipment jsonb not null default '[]'::jsonb`
- `foods jsonb not null default '[]'::jsonb`
- `body_state jsonb not null default '{}'::jsonb`
- `ai_result jsonb not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

并创建：

- `daily_records(sync_id, record_date desc)` 索引
- 必要的更新时间触发器或等价方案

## AI 输出格式要求

请为模型编写一个系统提示词，强制只返回严格 JSON，结构如下：

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
      "steps": ["动作1", "动作2", "动作3"]
    }
  ],
  "diet_plan": [
    {
      "meal": "午餐",
      "suggestion": "鸡胸肉 + 米饭 + 西兰花"
    }
  ],
  "recovery_tips": ["今晚保证 7 小时睡眠"],
  "warnings": ["如果持续疲劳请降低训练强度"]
}
```

如果模型返回非 JSON 内容，前端需要尽量提取 JSON 主体再解析；若仍失败，要显示友好报错。

## 代码组织建议

请按下面结构组织代码：

- `src/App.vue`
- `src/types.ts`
- `src/lib/storage.ts`
- `src/lib/modelscope.ts`
- `src/lib/supabase.ts`
- `src/styles.css`

如果项目规模不大，也可以保持精简，但至少要让 AI 调用、存储逻辑、类型定义分离清楚。

## 交付要求

请一次性产出：

1. 完整项目代码
2. `Supabase` 建表 SQL
3. 必要的环境常量放置方式
4. 如何运行项目
5. 如何验证：
- AI 生成是否正常
- 保存记录是否正常
- 历史回显是否正常
- `sync_id` 跨设备同步是否正常

---

## 已确认的产品决策

以下内容已经确认，不再需要重复询问：

1. 产品定位：主要给自己使用，但未来也希望其他人可以使用
2. 功能权重：`饮食建议` 和 `训练计划` 同等重要
3. 历史记录：采用 `简洁表格主视图 + 详情展开`，不采用时间轴作为默认方案
4. 扩展能力：需要预留 `拍照识别食物` 入口
5. 主题模式：必须支持浅色和深色主题

如果后续没有新的说明，请按以上确认内容直接实现，不要再次停下来询问这些基础设计问题。
