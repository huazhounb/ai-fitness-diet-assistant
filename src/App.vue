<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { AVAILABLE_MODELS, generatePlan } from './lib/modelscope'
import {
  createDefaultDailyInput,
  createDefaultProfile,
  loadState,
  saveState,
} from './lib/storage'
import { loadDailyRecords, saveDailyRecord, saveUserProfile } from './lib/supabase'
import type {
  AiFitnessPlan,
  DailyRecord,
  GoalType,
  ModelName,
  PersistedAppState,
  ThemeMode,
} from './types'

const initialState = loadState()

const syncId = ref(initialState.syncId)
const selectedModel = ref<ModelName>(initialState.selectedModel)
const themeMode = ref<ThemeMode>(initialState.themeMode)
const profile = reactive(initialState.profile)
const dailyInput = reactive(initialState.dailyInput)

const aiResult = ref<AiFitnessPlan | null>(null)
const historyRecords = ref<DailyRecord[]>([])
const selectedHistoryRecord = ref<DailyRecord | null>(null)

const profileSaving = ref(false)
const generating = ref(false)
const historyLoading = ref(false)
const recordSaving = ref(false)
const statusMessage = ref('本地已载入，随时可以生成今日建议。')
const errorMessage = ref('')

const dietPreferenceInput = ref('')
const equipmentInput = ref('')
const foodInput = ref('')
const focusInput = ref('')

const goalOptions: GoalType[] = ['减脂', '增肌', '维持']
const themeOptions: Array<{ label: string; value: ThemeMode }> = [
  { label: '跟随系统', value: 'system' },
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
]

const resolvedTheme = computed<'light' | 'dark'>(() => {
  if (themeMode.value === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return themeMode.value
})

const metrics = computed(() => {
  if (!aiResult.value) {
    return null
  }

  return [
    { label: '热量', value: `${aiResult.value.calorie_target} kcal` },
    { label: '蛋白质', value: `${aiResult.value.macros.protein_g} g` },
    { label: '碳水', value: `${aiResult.value.macros.carbs_g} g` },
    { label: '脂肪', value: `${aiResult.value.macros.fat_g} g` },
  ]
})

const hasAiResult = computed(() => aiResult.value !== null)

const getProfileSnapshot = () => ({
  nickname: profile.nickname,
  sex: profile.sex,
  age: profile.age,
  heightCm: profile.heightCm,
  currentWeightKg: profile.currentWeightKg,
  targetWeightKg: profile.targetWeightKg,
  goal: profile.goal,
  trainingDaysPerWeek: profile.trainingDaysPerWeek,
  dietPreferences: [...profile.dietPreferences],
})

const getDailyInputSnapshot = () => ({
  recordDate: dailyInput.recordDate,
  weightKg: dailyInput.weightKg,
  trainingGoal: dailyInput.trainingGoal,
  durationMinutes: dailyInput.durationMinutes,
  equipment: [...dailyInput.equipment],
  foods: [...dailyInput.foods],
  bodyState: {
    energy: dailyInput.bodyState.energy,
    hunger: dailyInput.bodyState.hunger,
    fatigue: dailyInput.bodyState.fatigue,
    note: dailyInput.bodyState.note,
    trainingFocuses: [...dailyInput.bodyState.trainingFocuses],
  },
  photoFoodNotes: dailyInput.photoFoodNotes,
})

const getAiResultSnapshot = (): AiFitnessPlan | null => {
  if (!aiResult.value) {
    return null
  }

  return {
    summary: aiResult.value.summary,
    calorie_target: aiResult.value.calorie_target,
    macros: {
      protein_g: aiResult.value.macros.protein_g,
      carbs_g: aiResult.value.macros.carbs_g,
      fat_g: aiResult.value.macros.fat_g,
    },
    training_plan: aiResult.value.training_plan.map((item) => ({
      title: item.title,
      duration_minutes: item.duration_minutes,
      steps: [...item.steps],
    })),
    diet_plan: aiResult.value.diet_plan.map((item) => ({
      meal: item.meal,
      suggestion: item.suggestion,
    })),
    recovery_tips: [...aiResult.value.recovery_tips],
    warnings: [...aiResult.value.warnings],
  }
}

const saveLocalSnapshot = () => {
  const snapshot: PersistedAppState = {
    syncId: syncId.value.trim(),
    selectedModel: selectedModel.value,
    themeMode: themeMode.value,
    profile: getProfileSnapshot(),
    dailyInput: getDailyInputSnapshot(),
  }

  saveState(snapshot)
}

const setStatus = (message: string) => {
  statusMessage.value = message
  errorMessage.value = ''
}

const setError = (message: string) => {
  errorMessage.value = message
}

const addTag = (target: string[], rawValue: string, onDone?: () => void) => {
  const normalized = rawValue.trim()
  if (!normalized) {
    return
  }
  if (target.includes(normalized)) {
    setError(`“${normalized}” 已存在。`)
    return
  }
  target.push(normalized)
  onDone?.()
}

const removeTag = (target: string[], tag: string) => {
  const index = target.indexOf(tag)
  if (index >= 0) {
    target.splice(index, 1)
  }
}

const saveProfileToCloud = async () => {
  if (!syncId.value.trim()) {
    setError('请先填写 sync_id。')
    return
  }

  profileSaving.value = true
  try {
    await saveUserProfile(syncId.value.trim(), getProfileSnapshot())
    setStatus('基础资料已同步到云端。')
  } catch (error) {
    setError(error instanceof Error ? error.message : '基础资料保存失败。')
  } finally {
    profileSaving.value = false
  }
}

const generateAdvice = async () => {
  errorMessage.value = ''

  if (!syncId.value.trim()) {
    setError('请先填写 sync_id，再生成建议。')
    return
  }

  if (!dailyInput.trainingGoal.trim()) {
    setError('请先补充今日训练目标。')
    return
  }

  generating.value = true
  try {
    const result = await generatePlan(
      {
        profile: getProfileSnapshot(),
        dailyInput: getDailyInputSnapshot(),
      },
      selectedModel.value,
    )
    aiResult.value = result
    setStatus('AI 建议已生成，可以直接保存到历史。')
  } catch (error) {
    setError(error instanceof Error ? error.message : '生成失败，请稍后再试。')
  } finally {
    generating.value = false
  }
}

const saveTodayRecord = async () => {
  if (!aiResult.value) {
    setError('请先生成 AI 建议，再保存今日记录。')
    return
  }

  recordSaving.value = true
  try {
    const aiResultSnapshot = getAiResultSnapshot()
    if (!aiResultSnapshot) {
      setError('请先生成 AI 建议，再保存今日记录。')
      return
    }

    await saveDailyRecord({
      syncId: syncId.value.trim(),
      recordDate: dailyInput.recordDate,
      profileSnapshot: getProfileSnapshot(),
      dailyInput: getDailyInputSnapshot(),
      aiResult: aiResultSnapshot,
    })
    setStatus('今日记录已保存并同步。')
    await reloadHistory()
  } catch (error) {
    setError(error instanceof Error ? error.message : '记录保存失败。')
  } finally {
    recordSaving.value = false
  }
}

const reloadHistory = async () => {
  if (!syncId.value.trim()) {
    historyRecords.value = []
    return
  }

  historyLoading.value = true
  try {
    historyRecords.value = await loadDailyRecords(syncId.value.trim())
    if (!selectedHistoryRecord.value && historyRecords.value.length > 0) {
      selectedHistoryRecord.value = historyRecords.value[0]
    }
    setStatus(`已载入 ${historyRecords.value.length} 条历史记录。`)
  } catch (error) {
    setError(error instanceof Error ? error.message : '历史记录读取失败。')
  } finally {
    historyLoading.value = false
  }
}

const applyHistoryRecord = (record: DailyRecord) => {
  selectedHistoryRecord.value = record
  Object.assign(profile, {
    ...record.profileSnapshot,
    dietPreferences: [...record.profileSnapshot.dietPreferences],
  })
  Object.assign(dailyInput, {
    ...record.dailyInput,
    equipment: [...record.dailyInput.equipment],
    foods: [...record.dailyInput.foods],
    bodyState: {
      ...record.dailyInput.bodyState,
      trainingFocuses: [...record.dailyInput.bodyState.trainingFocuses],
    },
  })
  aiResult.value = {
    ...record.aiResult,
    macros: { ...record.aiResult.macros },
    training_plan: record.aiResult.training_plan.map((item) => ({
      ...item,
      steps: [...item.steps],
    })),
    diet_plan: record.aiResult.diet_plan.map((item) => ({ ...item })),
    recovery_tips: [...record.aiResult.recovery_tips],
    warnings: [...record.aiResult.warnings],
  }
  setStatus(`已载入 ${record.recordDate} 的记录，可继续编辑。`)
}

const resetTodayInput = () => {
  Object.assign(dailyInput, createDefaultDailyInput())
  aiResult.value = null
  setStatus('今日输入已重置。')
}

const resetProfile = () => {
  Object.assign(profile, createDefaultProfile())
  setStatus('基础资料已恢复默认值。')
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(value))

const applyTheme = () => {
  const root = document.documentElement
  const body = document.body
  const theme = resolvedTheme.value

  root.setAttribute('data-theme', theme)
  body.setAttribute('data-theme', theme)
  root.style.colorScheme = theme
  body.style.colorScheme = theme
}

let mediaQuery: MediaQueryList | null = null
const systemThemeListener = () => {
  if (themeMode.value === 'system') {
    applyTheme()
  }
}

watch(
  [syncId, selectedModel, () => profile, () => dailyInput],
  () => {
    saveLocalSnapshot()
  },
  { deep: true },
)

watch(
  themeMode,
  () => {
    saveLocalSnapshot()
    applyTheme()
  },
  { immediate: true },
)

watch(syncId, () => {
  void reloadHistory()
})

onMounted(async () => {
  applyTheme()
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', systemThemeListener)
  await reloadHistory()
})

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', systemThemeListener)
})
</script>

<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar__identity">
        <p class="eyebrow">Adaptive Daily Protocol</p>
        <h1>AI 健身饮食助手</h1>
        <p class="subtle">
          为个人使用优化，也保留共享给其他用户的结构基础。
        </p>
      </div>

      <div class="topbar__controls">
        <label class="field compact">
          <span>模型</span>
          <select v-model="selectedModel">
            <option
              v-for="model in AVAILABLE_MODELS"
              :key="model"
              :value="model"
            >
              {{ model }}
            </option>
          </select>
        </label>

        <label class="field compact">
          <span>主题</span>
          <select v-model="themeMode">
            <option
              v-for="option in themeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label class="field compact sync-field">
          <span>sync_id</span>
          <input v-model.trim="syncId" type="text" placeholder="fit-xxxxxxx" />
        </label>
      </div>
    </header>

    <section class="statusbar">
      <div class="statusbar__meta">
        <span class="statusbar__item">当前日期 {{ dailyInput.recordDate }}</span>
        <span class="statusbar__item">记录数 {{ historyRecords.length }}</span>
        <span class="statusbar__item">模型 {{ selectedModel }}</span>
      </div>
      <p class="statusbar__text">{{ statusMessage }}</p>
      <p v-if="errorMessage" class="statusbar__error">{{ errorMessage }}</p>
    </section>

    <main class="workspace">
      <section class="panel">
        <div class="panel__header">
          <div>
            <p class="panel__eyebrow">Profile</p>
            <h2>基础资料</h2>
          </div>
          <div class="panel__actions">
            <button class="button button--ghost" type="button" @click="resetProfile">
              恢复默认
            </button>
            <button
              class="button"
              type="button"
              :disabled="profileSaving"
              @click="saveProfileToCloud"
            >
              {{ profileSaving ? '同步中...' : '同步资料' }}
            </button>
          </div>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>昵称</span>
            <input v-model.trim="profile.nickname" type="text" placeholder="可选" />
          </label>
          <label class="field">
            <span>性别</span>
            <select v-model="profile.sex">
              <option value="男">男</option>
              <option value="女">女</option>
              <option value="其他">其他</option>
            </select>
          </label>
          <label class="field">
            <span>年龄</span>
            <input v-model.number="profile.age" type="number" min="1" />
          </label>
          <label class="field">
            <span>身高 / cm</span>
            <input v-model.number="profile.heightCm" type="number" min="50" />
          </label>
          <label class="field">
            <span>当前体重 / kg</span>
            <input v-model.number="profile.currentWeightKg" type="number" min="1" step="0.1" />
          </label>
          <label class="field">
            <span>目标体重 / kg</span>
            <input v-model.number="profile.targetWeightKg" type="number" min="1" step="0.1" />
          </label>
          <label class="field">
            <span>目标类型</span>
            <select v-model="profile.goal">
              <option v-for="goal in goalOptions" :key="goal" :value="goal">
                {{ goal }}
              </option>
            </select>
          </label>
          <label class="field">
            <span>每周训练天数</span>
            <input
              v-model.number="profile.trainingDaysPerWeek"
              type="number"
              min="0"
              max="7"
            />
          </label>
        </div>

        <div class="line-block">
          <div class="line-block__header">
            <h3>饮食偏好 / 忌口</h3>
            <span>回车添加或点按钮</span>
          </div>
          <div class="tag-entry">
            <input
              v-model="dietPreferenceInput"
              type="text"
              placeholder="例如：乳糖不耐、低盐、高蛋白"
              @keydown.enter.prevent="
                addTag(profile.dietPreferences, dietPreferenceInput, () => {
                  dietPreferenceInput = ''
                })
              "
            />
            <button
              class="button button--ghost"
              type="button"
              @click="
                addTag(profile.dietPreferences, dietPreferenceInput, () => {
                  dietPreferenceInput = ''
                })
              "
            >
              添加
            </button>
          </div>
          <div class="tag-list">
            <button
              v-for="tag in profile.dietPreferences"
              :key="tag"
              class="tag"
              type="button"
              @click="removeTag(profile.dietPreferences, tag)"
            >
              {{ tag }} <span>移除</span>
            </button>
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel__header">
          <div>
            <p class="panel__eyebrow">Daily Input</p>
            <h2>今日输入</h2>
          </div>
          <div class="panel__actions">
            <button class="button button--ghost" type="button" @click="resetTodayInput">
              清空今日
            </button>
            <button
              class="button"
              type="button"
              :disabled="generating"
              @click="generateAdvice"
            >
              {{ generating ? '生成中...' : '生成建议' }}
            </button>
          </div>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>记录日期</span>
            <input v-model="dailyInput.recordDate" type="date" />
          </label>
          <label class="field">
            <span>今日体重 / kg</span>
            <input v-model.number="dailyInput.weightKg" type="number" min="1" step="0.1" />
          </label>
          <label class="field field--wide">
            <span>今日训练目标</span>
            <input
              v-model.trim="dailyInput.trainingGoal"
              type="text"
              placeholder="例如：45 分钟力量 + 15 分钟快走"
            />
          </label>
          <label class="field">
            <span>可训练时长 / 分钟</span>
            <input
              v-model.number="dailyInput.durationMinutes"
              type="number"
              min="0"
              step="5"
            />
          </label>
          <label class="field">
            <span>精力</span>
            <input v-model.number="dailyInput.bodyState.energy" type="range" min="1" max="5" />
            <small>{{ dailyInput.bodyState.energy }}/5</small>
          </label>
          <label class="field">
            <span>饥饿感</span>
            <input v-model.number="dailyInput.bodyState.hunger" type="range" min="1" max="5" />
            <small>{{ dailyInput.bodyState.hunger }}/5</small>
          </label>
          <label class="field">
            <span>疲劳感</span>
            <input v-model.number="dailyInput.bodyState.fatigue" type="range" min="1" max="5" />
            <small>{{ dailyInput.bodyState.fatigue }}/5</small>
          </label>
          <label class="field field--wide">
            <span>补充说明</span>
            <textarea
              v-model.trim="dailyInput.bodyState.note"
              rows="3"
              placeholder="例如：昨晚睡眠不足、今天膝盖略酸"
            />
          </label>
        </div>

        <div class="line-block">
          <div class="line-block__header">
            <h3>训练重点</h3>
            <span>预留为 AI 决策的重要上下文</span>
          </div>
          <div class="tag-entry">
            <input
              v-model="focusInput"
              type="text"
              placeholder="例如：胸、背、臀腿、恢复训练"
              @keydown.enter.prevent="
                addTag(dailyInput.bodyState.trainingFocuses, focusInput, () => {
                  focusInput = ''
                })
              "
            />
            <button
              class="button button--ghost"
              type="button"
              @click="
                addTag(dailyInput.bodyState.trainingFocuses, focusInput, () => {
                  focusInput = ''
                })
              "
            >
              添加
            </button>
          </div>
          <div class="tag-list">
            <button
              v-for="tag in dailyInput.bodyState.trainingFocuses"
              :key="tag"
              class="tag"
              type="button"
              @click="removeTag(dailyInput.bodyState.trainingFocuses, tag)"
            >
              {{ tag }} <span>移除</span>
            </button>
          </div>
        </div>

        <div class="line-block">
          <div class="line-block__header">
            <h3>可用器械</h3>
            <span>支持回车快速添加</span>
          </div>
          <div class="tag-entry">
            <input
              v-model="equipmentInput"
              type="text"
              placeholder="例如：弹力带、杠铃、跑步机"
              @keydown.enter.prevent="
                addTag(dailyInput.equipment, equipmentInput, () => {
                  equipmentInput = ''
                })
              "
            />
            <button
              class="button button--ghost"
              type="button"
              @click="
                addTag(dailyInput.equipment, equipmentInput, () => {
                  equipmentInput = ''
                })
              "
            >
              添加
            </button>
          </div>
          <div class="tag-list">
            <button
              v-for="tag in dailyInput.equipment"
              :key="tag"
              class="tag"
              type="button"
              @click="removeTag(dailyInput.equipment, tag)"
            >
              {{ tag }} <span>移除</span>
            </button>
          </div>
        </div>

        <div class="line-block">
          <div class="line-block__header">
            <h3>今日饮食</h3>
            <span>输入已吃或计划吃的食物</span>
          </div>
          <div class="tag-entry">
            <input
              v-model="foodInput"
              type="text"
              placeholder="例如：酸奶、香蕉、牛肉、米饭"
              @keydown.enter.prevent="
                addTag(dailyInput.foods, foodInput, () => {
                  foodInput = ''
                })
              "
            />
            <button
              class="button button--ghost"
              type="button"
              @click="
                addTag(dailyInput.foods, foodInput, () => {
                  foodInput = ''
                })
              "
            >
              添加
            </button>
          </div>
          <div class="tag-list">
            <button
              v-for="tag in dailyInput.foods"
              :key="tag"
              class="tag"
              type="button"
              @click="removeTag(dailyInput.foods, tag)"
            >
              {{ tag }} <span>移除</span>
            </button>
          </div>
        </div>

        <div class="line-block placeholder-block">
          <div class="line-block__header">
            <h3>拍照识别食物</h3>
            <span>v1 先预留入口，后续可接图片识别模型</span>
          </div>
          <div class="placeholder-block__content">
            <button class="button button--ghost" type="button" disabled>
              即将支持上传照片
            </button>
            <textarea
              v-model.trim="dailyInput.photoFoodNotes"
              rows="2"
              placeholder="先记录：未来这里将承接拍照识别结果或备注"
            />
          </div>
        </div>
      </section>

      <section class="panel panel--result">
        <div class="panel__header">
          <div>
            <p class="panel__eyebrow">AI Output</p>
            <h2>今日建议</h2>
          </div>
          <div class="panel__actions">
            <button class="button" type="button" :disabled="recordSaving" @click="saveTodayRecord">
              {{ recordSaving ? '保存中...' : '保存记录' }}
            </button>
          </div>
        </div>

        <template v-if="hasAiResult">
          <div class="result-summary">
            <p>{{ aiResult?.summary }}</p>
          </div>

          <div class="metric-grid">
            <div v-for="metric in metrics" :key="metric.label" class="metric">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
            </div>
          </div>

          <div class="result-block">
            <div class="result-block__header">
              <h3>训练安排</h3>
              <span>{{ aiResult?.training_plan.length }} 项</span>
            </div>
            <article
              v-for="item in aiResult?.training_plan"
              :key="item.title"
              class="result-item"
            >
              <header>
                <strong>{{ item.title }}</strong>
                <span>{{ item.duration_minutes }} 分钟</span>
              </header>
              <ol>
                <li v-for="step in item.steps" :key="step">{{ step }}</li>
              </ol>
            </article>
          </div>

          <div class="result-block">
            <div class="result-block__header">
              <h3>饮食建议</h3>
              <span>{{ aiResult?.diet_plan.length }} 餐</span>
            </div>
            <div
              v-for="item in aiResult?.diet_plan"
              :key="`${item.meal}-${item.suggestion}`"
              class="result-row"
            >
              <strong>{{ item.meal }}</strong>
              <p>{{ item.suggestion }}</p>
            </div>
          </div>

          <div class="result-grid">
            <div class="result-block">
              <div class="result-block__header">
                <h3>恢复建议</h3>
              </div>
              <ul class="plain-list">
                <li v-for="tip in aiResult?.recovery_tips" :key="tip">{{ tip }}</li>
              </ul>
            </div>
            <div class="result-block">
              <div class="result-block__header">
                <h3>风险提醒</h3>
              </div>
              <ul class="plain-list plain-list--warning">
                <li v-for="warning in aiResult?.warnings" :key="warning">{{ warning }}</li>
              </ul>
            </div>
          </div>
        </template>

        <div v-else class="empty-state">
          <p>还没有生成建议。</p>
          <span>先完善左侧资料和今日输入，然后点击“生成建议”。</span>
        </div>
      </section>
    </main>

    <section class="history-panel">
      <div class="history-panel__header">
        <div>
          <p class="panel__eyebrow">History</p>
          <h2>历史记录</h2>
        </div>
        <div class="panel__actions">
          <button
            class="button button--ghost"
            type="button"
            :disabled="historyLoading"
            @click="reloadHistory"
          >
            {{ historyLoading ? '刷新中...' : '刷新记录' }}
          </button>
        </div>
      </div>

      <div class="history-layout">
        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>体重</th>
                <th>目标</th>
                <th>热量</th>
                <th>训练时长</th>
                <th>建议</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in historyRecords"
                :key="record.id || record.recordDate"
                :class="{
                  'is-active': selectedHistoryRecord?.recordDate === record.recordDate,
                }"
                @click="applyHistoryRecord(record)"
              >
                <td>{{ formatDate(record.recordDate) }}</td>
                <td>{{ record.dailyInput.weightKg ?? '--' }} kg</td>
                <td>{{ record.profileSnapshot.goal }}</td>
                <td>{{ record.aiResult.calorie_target }} kcal</td>
                <td>{{ record.dailyInput.durationMinutes ?? '--' }} 分钟</td>
                <td>{{ record.aiResult.summary }}</td>
              </tr>
              <tr v-if="historyRecords.length === 0">
                <td colspan="6" class="history-table__empty">
                  暂无历史记录，先生成并保存一条。
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <aside class="history-detail">
          <template v-if="selectedHistoryRecord">
            <div class="history-detail__header">
              <strong>{{ selectedHistoryRecord.recordDate }}</strong>
              <span>{{ selectedHistoryRecord.aiResult.calorie_target }} kcal</span>
            </div>
            <p class="history-detail__summary">
              {{ selectedHistoryRecord.aiResult.summary }}
            </p>
            <dl class="detail-grid">
              <div>
                <dt>训练目标</dt>
                <dd>{{ selectedHistoryRecord.dailyInput.trainingGoal }}</dd>
              </div>
              <div>
                <dt>体重</dt>
                <dd>{{ selectedHistoryRecord.dailyInput.weightKg ?? '--' }} kg</dd>
              </div>
              <div>
                <dt>器械</dt>
                <dd>{{ selectedHistoryRecord.dailyInput.equipment.join(' / ') || '--' }}</dd>
              </div>
              <div>
                <dt>饮食</dt>
                <dd>{{ selectedHistoryRecord.dailyInput.foods.join(' / ') || '--' }}</dd>
              </div>
            </dl>
            <button class="button" type="button" @click="applyHistoryRecord(selectedHistoryRecord)">
              载入到当前编辑区
            </button>
          </template>
          <div v-else class="empty-state empty-state--compact">
            <p>选择一条历史记录</p>
            <span>右侧会展开当天详情。</span>
          </div>
        </aside>
      </div>
    </section>
  </div>
</template>
