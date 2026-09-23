// ノーススター指標などのKPI計算。

export type KpiSession = {
  role: string;
  minutes: number;
}

export type KpiTask = {
  status: string;
  rework_count?: number;
}

export type KpiInput = {
  completedUnits?: number;
  sessions?: KpiSession[];
  tasks?: KpiTask[];
}

export type KpiResult = {
  completedUnits: number;
  totalMinutes: number;
  qualifiedMinutes: number;
  /** ノーススター：完了台数 ÷ 資格者総時間(h) */
  qualifiedProductivity: number;
  qualifiedMinutesPerUnit: number;
  totalMinutesPerUnit: number;
  preassemblyShift: number;
  assistantShift: number;
  firstPassRate: number;
  reworkRate: number;
  evidenceCompleteRate: number;
}

export function minutesOf(sessions: KpiSession[]): number {
  return sessions.reduce((sum, s) => sum + (s.minutes || 0), 0)
}

export function kpi(ctx: KpiInput): KpiResult {
  const sessions = ctx.sessions || []
  const tasks = ctx.tasks || []
  const units = ctx.completedUnits || 0

  const byRole: Record<string, number> = {}
  sessions.forEach((s) => {
    byRole[s.role] = (byRole[s.role] || 0) + (s.minutes || 0)
  })

  const total = minutesOf(sessions)
  const qualified = byRole.electrician || 0
  const assistant = byRole.assistant || 0
  const pre = (byRole.preassembly || 0) + (byRole.logistics || 0)

  const reworked = tasks.filter((t) => (t.rework_count || 0) > 0).length
  const submitted = tasks.filter((t) =>
    ['SUBMITTED', 'APPROVED_COMPLETE', 'REWORK_REQUIRED'].includes(t.status),
  ).length

  const evidenceOk = tasks.filter((t) => t.status === 'APPROVED_COMPLETE').length

  return {
    completedUnits: units,
    totalMinutes: total,
    qualifiedMinutes: qualified,
    qualifiedProductivity: qualified > 0 ? Number((units / (qualified / 60)).toFixed(2)) : 0,
    qualifiedMinutesPerUnit: units > 0 ? Number((qualified / units).toFixed(1)) : 0,
    totalMinutesPerUnit: units > 0 ? Number((total / units).toFixed(1)) : 0,
    preassemblyShift: total > 0 ? Number(((pre / total) * 100).toFixed(1)) : 0,
    assistantShift: total > 0 ? Number(((assistant / total) * 100).toFixed(1)) : 0,
    firstPassRate: submitted > 0 ? Number((((submitted - reworked) / submitted) * 100).toFixed(1)) : 0,
    reworkRate: submitted > 0 ? Number(((reworked / submitted) * 100).toFixed(1)) : 0,
    evidenceCompleteRate: submitted > 0 ? Number(((evidenceOk / submitted) * 100).toFixed(1)) : 0,
  }
}
