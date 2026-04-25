import type { AiFitnessPlan, GenerationPayload, ModelName } from '../types'

const MODELSCOPE_API_BASE =
  import.meta.env.VITE_MODELSCOPE_API_BASE ||
  'https://api-inference.modelscope.cn/v1'
const MODELSCOPE_TOKEN =
  import.meta.env.VITE_MODELSCOPE_TOKEN ||
  'ms-e3c17580-d0d3-42a0-ba46-aec598db02c8'

export const AVAILABLE_MODELS: ModelName[] = [
  'deepseek-ai/DeepSeek-V4-Flash',
  'ZhipuAI/GLM-5.1',
  'nv-community/NVIDIA-Nemotron-3-Super-120B-A12B-FP8',
]

export const SYSTEM_PROMPT = `
你是一名严谨的中文健身饮食助手。
你必须只输出严格 JSON，不要输出 Markdown，不要输出解释，不要输出代码块。
请基于用户资料、训练条件、饮食偏好和当日状态，输出当天的训练与饮食建议。
要求：
1. 保持务实、可执行、健康导向。
2. 如果用户疲劳高或可训练时长有限，要适当降低强度。
3. 饮食建议要优先使用常见、容易获得的食材。
4. 数值字段必须是数字，数组字段必须是数组。
5. JSON 结构必须完全符合如下字段：
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
`.trim()

export const generatePlan = async (
  payload: GenerationPayload,
  selectedModel: ModelName,
): Promise<AiFitnessPlan> => {
  const response = await fetch(`${MODELSCOPE_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MODELSCOPE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: selectedModel,
      temperature: 0.4,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: JSON.stringify(payload, null, 2),
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error('AI 服务暂时不可用，请稍后重试。')
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('AI 没有返回有效内容。')
  }

  const parsed = extractAndValidatePlan(content)
  return parsed
}

const extractAndValidatePlan = (content: string): AiFitnessPlan => {
  const jsonText = extractJson(content)
  const parsed = JSON.parse(jsonText) as Partial<AiFitnessPlan>

  if (
    typeof parsed.summary !== 'string' ||
    typeof parsed.calorie_target !== 'number' ||
    typeof parsed.macros?.protein_g !== 'number' ||
    typeof parsed.macros?.carbs_g !== 'number' ||
    typeof parsed.macros?.fat_g !== 'number' ||
    !Array.isArray(parsed.training_plan) ||
    !Array.isArray(parsed.diet_plan) ||
    !Array.isArray(parsed.recovery_tips) ||
    !Array.isArray(parsed.warnings)
  ) {
    throw new Error('AI 返回结构不完整，请重新生成。')
  }

  return {
    summary: parsed.summary,
    calorie_target: parsed.calorie_target,
    macros: parsed.macros,
    training_plan: parsed.training_plan.map((item) => ({
      title: typeof item.title === 'string' ? item.title : '训练建议',
      duration_minutes:
        typeof item.duration_minutes === 'number' ? item.duration_minutes : 0,
      steps: Array.isArray(item.steps)
        ? item.steps.filter((step): step is string => typeof step === 'string')
        : [],
    })),
    diet_plan: parsed.diet_plan.map((item) => ({
      meal: typeof item.meal === 'string' ? item.meal : '加餐',
      suggestion:
        typeof item.suggestion === 'string' ? item.suggestion : '请补充均衡饮食',
    })),
    recovery_tips: parsed.recovery_tips.filter(
      (item): item is string => typeof item === 'string',
    ),
    warnings: parsed.warnings.filter((item): item is string => typeof item === 'string'),
  }
}

const extractJson = (content: string): string => {
  const trimmed = content.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed
  }

  const firstBrace = trimmed.indexOf('{')
  if (firstBrace === -1) {
    throw new Error('AI 返回内容中没有找到 JSON。')
  }

  let depth = 0
  let start = -1
  let end = -1

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index]
    if (char === '{') {
      if (depth === 0) {
        start = index
      }
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        end = index
        break
      }
    }
  }

  if (start === -1 || end === -1) {
    throw new Error('AI 返回的 JSON 不完整。')
  }

  return trimmed.slice(start, end + 1)
}
