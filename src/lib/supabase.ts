import type {
  DailyRecord,
  SupabaseDailyRecordRow,
  SupabaseUserProfileRow,
  UserProfile,
} from '../types'

const SUPABASE_PROJECT_URL =
  import.meta.env.VITE_SUPABASE_PROJECT_URL ||
  'https://twwidfdamehykgxsdoqz.supabase.co'
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_r4fPj84rXIociUo5Qgizmw_V_W2dhVL'

const buildHeaders = (extra?: Record<string, string>): HeadersInit => ({
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  ...extra,
})

export const saveUserProfile = async (
  syncId: string,
  profile: UserProfile,
): Promise<void> => {
  const payload: SupabaseUserProfileRow = {
    sync_id: syncId,
    nickname: profile.nickname || null,
    sex: profile.sex,
    age: profile.age,
    height_cm: profile.heightCm,
    current_weight_kg: profile.currentWeightKg,
    target_weight_kg: profile.targetWeightKg,
    goal: profile.goal,
    training_days_per_week: profile.trainingDaysPerWeek,
    diet_preferences: profile.dietPreferences,
  }

  const response = await fetch(
    `${SUPABASE_PROJECT_URL}/rest/v1/user_profiles?on_conflict=sync_id`,
    {
      method: 'POST',
      headers: buildHeaders({
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify(payload),
    },
  )

  if (!response.ok) {
    throw new Error('基础资料保存失败，请检查 Supabase 表结构。')
  }
}

export const saveDailyRecord = async (record: DailyRecord): Promise<void> => {
  const payload: SupabaseDailyRecordRow = {
    sync_id: record.syncId,
    record_date: record.recordDate,
    weight_kg: record.dailyInput.weightKg,
    training_goal: record.dailyInput.trainingGoal,
    duration_minutes: record.dailyInput.durationMinutes,
    equipment: record.dailyInput.equipment,
    foods: record.dailyInput.foods,
    body_state: {
      ...record.dailyInput.bodyState,
      note: [
        record.dailyInput.bodyState.note,
        record.dailyInput.photoFoodNotes
          ? `拍照识别预留：${record.dailyInput.photoFoodNotes}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    },
    ai_result: {
      ...record.aiResult,
      profile_snapshot: record.profileSnapshot,
    } as SupabaseDailyRecordRow['ai_result'],
  }

  const response = await fetch(
    `${SUPABASE_PROJECT_URL}/rest/v1/daily_records?on_conflict=sync_id,record_date`,
    {
      method: 'POST',
      headers: buildHeaders({
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify(payload),
    },
  )

  if (!response.ok) {
    throw new Error('每日记录保存失败，请检查 Supabase 表结构。')
  }
}

export const loadDailyRecords = async (syncId: string): Promise<DailyRecord[]> => {
  const response = await fetch(
    `${SUPABASE_PROJECT_URL}/rest/v1/daily_records?sync_id=eq.${encodeURIComponent(syncId)}&order=record_date.desc`,
    {
      method: 'GET',
      headers: buildHeaders(),
    },
  )

  if (!response.ok) {
    throw new Error('历史记录加载失败，请检查 sync_id 或 Supabase 配置。')
  }

  const rows = (await response.json()) as SupabaseDailyRecordRow[]
  return rows.map((row) => {
    const snapshot = extractProfileSnapshot(row.ai_result)
    return {
      id: row.id,
      syncId: row.sync_id,
      recordDate: row.record_date,
      profileSnapshot: snapshot,
      dailyInput: {
        recordDate: row.record_date,
        weightKg: row.weight_kg,
        trainingGoal: row.training_goal || '',
        durationMinutes: row.duration_minutes,
        equipment: ensureStringArray(row.equipment),
        foods: ensureStringArray(row.foods),
        bodyState: {
          energy: row.body_state?.energy ?? 3,
          hunger: row.body_state?.hunger ?? 3,
          fatigue: row.body_state?.fatigue ?? 3,
          note: row.body_state?.note ?? '',
          trainingFocuses: ensureStringArray(row.body_state?.trainingFocuses),
        },
        photoFoodNotes: '',
      },
      aiResult: row.ai_result,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
}

const ensureStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const extractProfileSnapshot = (value: unknown): UserProfile => {
  const fallback: UserProfile = {
    nickname: '',
    sex: '男',
    age: null,
    heightCm: null,
    currentWeightKg: null,
    targetWeightKg: null,
    goal: '减脂',
    trainingDaysPerWeek: null,
    dietPreferences: [],
  }

  if (!value || typeof value !== 'object') {
    return fallback
  }

  const snapshot = (value as { profile_snapshot?: Partial<UserProfile> }).profile_snapshot

  return {
    ...fallback,
    ...snapshot,
    dietPreferences: ensureStringArray(snapshot?.dietPreferences),
  }
}
