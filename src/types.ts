export type GoalType = '减脂' | '增肌' | '维持'
export type SexType = '男' | '女' | '其他'
export type ThemeMode = 'system' | 'light' | 'dark'
export type ModelName =
  | 'deepseek-ai/DeepSeek-V4-Flash'
  | 'ZhipuAI/GLM-5.1'
  | 'nv-community/NVIDIA-Nemotron-3-Super-120B-A12B-FP8'

export interface UserProfile {
  nickname: string
  sex: SexType
  age: number | null
  heightCm: number | null
  currentWeightKg: number | null
  targetWeightKg: number | null
  goal: GoalType
  trainingDaysPerWeek: number | null
  dietPreferences: string[]
}

export interface BodyState {
  energy: number
  hunger: number
  fatigue: number
  note: string
  trainingFocuses: string[]
}

export interface DailyInput {
  recordDate: string
  weightKg: number | null
  trainingGoal: string
  durationMinutes: number | null
  equipment: string[]
  foods: string[]
  bodyState: BodyState
  photoFoodNotes: string
}

export interface MacroPlan {
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface TrainingPlanItem {
  title: string
  duration_minutes: number
  steps: string[]
}

export interface DietPlanItem {
  meal: string
  suggestion: string
}

export interface AiFitnessPlan {
  summary: string
  calorie_target: number
  macros: MacroPlan
  training_plan: TrainingPlanItem[]
  diet_plan: DietPlanItem[]
  recovery_tips: string[]
  warnings: string[]
}

export interface DailyRecord {
  id?: string
  syncId: string
  recordDate: string
  profileSnapshot: UserProfile
  dailyInput: DailyInput
  aiResult: AiFitnessPlan
  createdAt?: string
  updatedAt?: string
}

export interface SupabaseUserProfileRow {
  id?: string
  sync_id: string
  nickname: string | null
  sex: string | null
  age: number | null
  height_cm: number | null
  current_weight_kg: number | null
  target_weight_kg: number | null
  goal: string | null
  training_days_per_week: number | null
  diet_preferences: string[]
  created_at?: string
  updated_at?: string
}

export interface SupabaseDailyRecordRow {
  id?: string
  sync_id: string
  record_date: string
  weight_kg: number | null
  training_goal: string | null
  duration_minutes: number | null
  equipment: string[]
  foods: string[]
  body_state: BodyState
  ai_result: AiFitnessPlan
  created_at?: string
  updated_at?: string
}

export interface GenerationPayload {
  profile: UserProfile
  dailyInput: DailyInput
}

export interface PersistedAppState {
  syncId: string
  themeMode: ThemeMode
  selectedModel: ModelName
  profile: UserProfile
  dailyInput: DailyInput
}
