import type {
  DailyInput,
  ModelName,
  PersistedAppState,
  ThemeMode,
  UserProfile,
} from '../types'

const STORAGE_KEY = 'ai-fitness-diet-assistant::state'

export const DEFAULT_MODEL: ModelName = 'deepseek-ai/DeepSeek-V4-Flash'

export const createDefaultProfile = (): UserProfile => ({
  nickname: '',
  sex: '男',
  age: 28,
  heightCm: 175,
  currentWeightKg: 72,
  targetWeightKg: 68,
  goal: '减脂',
  trainingDaysPerWeek: 4,
  dietPreferences: ['少油', '高蛋白'],
})

export const getToday = (): string => {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const createDefaultDailyInput = (): DailyInput => ({
  recordDate: getToday(),
  weightKg: 72,
  trainingGoal: '控制热量，同时完成 40 分钟力量训练',
  durationMinutes: 45,
  equipment: ['瑜伽垫', '哑铃'],
  foods: ['鸡蛋', '燕麦', '鸡胸肉', '米饭'],
  bodyState: {
    energy: 3,
    hunger: 3,
    fatigue: 2,
    note: '',
    trainingFocuses: ['上肢', '核心'],
  },
  photoFoodNotes: '',
})

const createRandomSyncId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `fit-${crypto.randomUUID().slice(0, 8)}`
  }
  return `fit-${Math.random().toString(36).slice(2, 10)}`
}

export const createDefaultState = (): PersistedAppState => ({
  syncId: createRandomSyncId(),
  themeMode: 'system',
  selectedModel: DEFAULT_MODEL,
  profile: createDefaultProfile(),
  dailyInput: createDefaultDailyInput(),
})

export const loadState = (): PersistedAppState => {
  if (typeof window === 'undefined') {
    return createDefaultState()
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return createDefaultState()
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedAppState>
    return {
      syncId: parsed.syncId || createRandomSyncId(),
      themeMode: isThemeMode(parsed.themeMode) ? parsed.themeMode : 'system',
      selectedModel: isModelName(parsed.selectedModel)
        ? parsed.selectedModel
        : DEFAULT_MODEL,
      profile: {
        ...createDefaultProfile(),
        ...parsed.profile,
      },
      dailyInput: {
        ...createDefaultDailyInput(),
        ...parsed.dailyInput,
        bodyState: {
          ...createDefaultDailyInput().bodyState,
          ...parsed.dailyInput?.bodyState,
        },
      },
    }
  } catch {
    return createDefaultState()
  }
}

export const saveState = (state: PersistedAppState): void => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'system' || value === 'light' || value === 'dark'

const isModelName = (value: unknown): value is ModelName =>
  value === 'deepseek-ai/DeepSeek-V4-Flash' ||
  value === 'ZhipuAI/GLM-5.1' ||
  value === 'nv-community/NVIDIA-Nemotron-3-Super-120B-A12B-FP8'
