import { kpi } from '@/lib/domain/kpi'
import { evaluateLabor, type LaborAnswers } from '@/lib/domain/labor-check'
import {
  type ClassificationVersion,
  type TaskClassificationSnapshot,
  type TaskRecord,
  type TrainingResult,
  type UserQualification,
  type UserRecord,
} from '@/lib/domain/task-classification'
import {
  type AssignmentContext,
  type EvidenceRecord,
  canApproveClassification,
  canAssign,
  canCompleteWorkPackage,
  canReleaseWorkPackage,
  canStart,
  canSubmit,
  isTaskVisibleTo,
} from '@/lib/domain/task-gates'

export type SelfTestCase = {
  group: string;
  name: string;
  actual: unknown;
  expected: unknown;
}

function cls(over: Partial<TaskClassificationSnapshot> = {}): TaskClassificationSnapshot {
  return {
    status: 'ASSISTANT_ALLOWED',
    required_qualification_codes: [],
    required_training_codes: [],
    required_evidence_types: [],
    allowed_location_type: ['SITE'],
    energization_condition: 'NO_ELECTRICAL_CONTACT',
    supervision_type: 'ON_SITE',
    is_checkpoint: false,
    ...over,
  }
}

function task(over: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: 'tsk_1',
    status: 'READY',
    assigned_user_id: null,
    title: 'テスト工程',
    classification_snapshot: cls(),
    ...over,
  }
}

const ACTIVE: ClassificationVersion = { state: 'ACTIVE' }
const DRAFT_VER: ClassificationVersion = { state: 'DRAFT' }

const assistant: UserRecord = { id: 'u_a', role: 'assistant', name: 'アシスタント' }
const electrician: UserRecord = { id: 'u_e', role: 'electrician', name: '電気工事士' }
const preassembly: UserRecord = { id: 'u_p', role: 'preassembly', name: '拠点担当' }

const quals: UserQualification[] = [
  { user_id: 'u_e', code: 'DENKI_KOJI_2', verified_at: '2020-01-01T00:00:00Z', expires_on: null },
]
const expiredQuals: UserQualification[] = [
  { user_id: 'u_e', code: 'DENKI_KOJI_2', verified_at: '2020-01-01T00:00:00Z', expires_on: '2020-12-31' },
]
const trainings: TrainingResult[] = [
  { user_id: 'u_a', code: 'LIGHT_ASSIST_BASIC', passed: true, expires_on: null },
]

function ctx(over: Partial<AssignmentContext> = {}): AssignmentContext {
  return {
    userQualifications: quals,
    trainingResults: trainings,
    version: ACTIVE,
    labor: 'CONFIRMED',
    ...over,
  }
}

const qualifiedTask = task({
  classification_snapshot: cls({ status: 'QUALIFIED_ONLY', required_qualification_codes: ['DENKI_KOJI_2'] }),
})

const revokedQuals: UserQualification[] = [
  {
    user_id: 'u_e',
    code: 'DENKI_KOJI_2',
    verified_at: '2020-01-01T00:00:00Z',
    expires_on: null,
    revoked_at: '2026-07-01T00:00:00Z',
  },
]
const suspendedQuals: UserQualification[] = [
  {
    user_id: 'u_e',
    code: 'DENKI_KOJI_2',
    verified_at: '2020-01-01T00:00:00Z',
    expires_on: null,
    suspended_at: '2026-07-01T00:00:00Z',
  },
]

const evTask = task({
  id: 'tsk_ev',
  status: 'IN_PROGRESS',
  classification_snapshot: cls({ required_evidence_types: ['BEFORE_PHOTO', 'AFTER_PHOTO'] }),
})

const cp = task({ id: 'tsk_cp', status: 'APPROVED_COMPLETE', classification_snapshot: cls({ is_checkpoint: true }) })
const done = task({ id: 'tsk_d', status: 'APPROVED_COMPLETE' })

const okAnswers: LaborAnswers = {
  employer: '施工会社が雇用',
  direction: '施工会社',
  assignment: '施工会社',
  safety: '施工会社',
  liability: '施工会社',
  independence: '該当なし（外注しない）',
  license: '満たす',
  insurance: '一致する',
}

const k = kpi({
  completedUnits: 60,
  sessions: [
    { role: 'electrician', minutes: 540 },
    { role: 'assistant', minutes: 420 },
    { role: 'preassembly', minutes: 150 },
  ],
  tasks: [
    { status: 'APPROVED_COMPLETE', rework_count: 0 },
    { status: 'APPROVED_COMPLETE', rework_count: 1 },
  ],
})

export const selfTestCases: SelfTestCase[] = [
  // --- 区分と版 ---
  {
    group: '区分と版',
    name: '未承認(REVIEW_REQUIRED)は割当できない',
    actual: canAssign(assistant, task({ classification_snapshot: cls({ status: 'REVIEW_REQUIRED' }) }), ctx()).ok,
    expected: false,
  },
  {
    group: '区分と版',
    name: 'PROHIBITEDは割当できない',
    actual: canAssign(assistant, task({ classification_snapshot: cls({ status: 'PROHIBITED' }) }), ctx()).ok,
    expected: false,
  },
  {
    group: '区分と版',
    name: '区分版がACTIVEでないと割当できない',
    actual: canAssign(assistant, task(), ctx({ version: DRAFT_VER })).ok,
    expected: false,
  },

  // --- 役割 ---
  {
    group: '役割',
    name: 'アシスタントは資格者限定タスクを担当できない',
    actual: canAssign(
      assistant,
      task({ classification_snapshot: cls({ status: 'QUALIFIED_ONLY', required_qualification_codes: ['DENKI_KOJI_2'] }) }),
      ctx(),
    ).ok,
    expected: false,
  },
  {
    group: '役割',
    name: 'アシスタントに資格者限定タスクは表示しない',
    actual: isTaskVisibleTo(assistant, task({ classification_snapshot: cls({ status: 'QUALIFIED_ONLY' }) })),
    expected: false,
  },
  {
    group: '役割',
    name: '管理者には全タスクが見える',
    actual: isTaskVisibleTo({ id: 'u_m', role: 'manager' }, task({ classification_snapshot: cls({ status: 'QUALIFIED_ONLY' }) })),
    expected: true,
  },

  // --- 資格・教育 ---
  {
    group: '資格・教育',
    name: '有効な資格があれば資格者は割当できる',
    actual: canAssign(electrician, qualifiedTask, ctx()).ok,
    expected: true,
  },
  {
    group: '資格・教育',
    name: '資格が失効していると割当できない',
    actual: canAssign(electrician, qualifiedTask, ctx({ userQualifications: expiredQuals })).ok,
    expected: false,
  },
  {
    group: '資格・教育',
    name: '必要教育が未修了だと割当できない',
    actual: canAssign(
      assistant,
      task({ classification_snapshot: cls({ required_training_codes: ['LIGHT_ASSIST_BASIC'] }) }),
      ctx({ trainingResults: [] }),
    ).ok,
    expected: false,
  },
  {
    group: '資格・教育',
    name: '必要教育を修了していれば割当できる',
    actual: canAssign(
      assistant,
      task({ classification_snapshot: cls({ required_training_codes: ['LIGHT_ASSIST_BASIC'] }) }),
      ctx(),
    ).ok,
    expected: true,
  },

  // --- ゲート2：契約・指揮命令 ---
  {
    group: 'ゲート2：契約・指揮命令',
    name: '契約・指揮命令が未確認だと現場のアシスタント配置はできない',
    actual: canAssign(assistant, task(), ctx({ labor: null })).ok,
    expected: false,
  },
  {
    group: 'ゲート2：契約・指揮命令',
    name: '契約・指揮命令がHOLDでも拠点作業は実施できる',
    actual: canAssign(
      preassembly,
      task({ classification_snapshot: cls({ status: 'PREASSEMBLY_ONLY', allowed_location_type: ['PREASSEMBLY_CENTER'] }) }),
      ctx({ labor: null }),
    ).ok,
    expected: true,
  },
  {
    group: 'ゲート2：契約・指揮命令',
    name: '契約・指揮命令が確認済みなら現場のアシスタント配置ができる',
    actual: canAssign(assistant, task(), ctx()).ok,
    expected: true,
  },

  // --- 資格の取消・停止（H-2） ---
  {
    group: '資格の取消・停止（H-2）',
    name: '免状が取消されていたら、期限内でも割当できない',
    actual: canAssign(electrician, qualifiedTask, ctx({ userQualifications: revokedQuals })).ok,
    expected: false,
  },
  {
    group: '資格の取消・停止（H-2）',
    name: '免状が停止されていたら、期限内でも割当できない',
    actual: canAssign(electrician, qualifiedTask, ctx({ userQualifications: suspendedQuals })).ok,
    expected: false,
  },

  // --- 開始時の再判定 ---
  {
    group: '開始時の再判定',
    name: '未割当のタスクは開始できない（H-4）',
    actual: canStart(
      electrician,
      task({
        assigned_user_id: null,
        status: 'READY',
        classification_snapshot: cls({ status: 'QUALIFIED_ONLY', required_qualification_codes: ['DENKI_KOJI_2'] }),
      }),
      ctx(),
    ).ok,
    expected: false,
  },
  {
    group: '開始時の再判定',
    name: '他人に割り当てられたタスクは開始できない',
    actual: canStart(assistant, task({ assigned_user_id: 'u_other', status: 'ASSIGNED' }), ctx()).ok,
    expected: false,
  },
  {
    group: '開始時の再判定',
    name: '完了済みのタスクは開始できない',
    actual: canStart(assistant, task({ status: 'APPROVED_COMPLETE' }), ctx()).ok,
    expected: false,
  },
  {
    group: '開始時の再判定',
    name: '割当後に資格が失効したら開始できない',
    actual: canStart(
      electrician,
      task({
        classification_snapshot: cls({ status: 'QUALIFIED_ONLY', required_qualification_codes: ['DENKI_KOJI_2'] }),
        assigned_user_id: 'u_e',
        status: 'ASSIGNED',
      }),
      ctx({ userQualifications: expiredQuals }),
    ).ok,
    expected: false,
  },

  // --- 証跡 ---
  {
    group: '証跡',
    name: '必須証跡が不足していると完了申請できない',
    actual: canSubmit(evTask, [{ task_id: 'tsk_ev', evidence_type: 'BEFORE_PHOTO' }] satisfies EvidenceRecord[]).ok,
    expected: false,
  },
  {
    group: '証跡',
    name: '必須証跡が揃えば完了申請できる',
    actual: canSubmit(evTask, [
      { task_id: 'tsk_ev', evidence_type: 'BEFORE_PHOTO' },
      { task_id: 'tsk_ev', evidence_type: 'AFTER_PHOTO' },
    ] satisfies EvidenceRecord[]).ok,
    expected: true,
  },
  {
    group: '証跡',
    name: '他タスクの証跡は数えない',
    actual: canSubmit(evTask, [
      { task_id: 'tsk_ev', evidence_type: 'BEFORE_PHOTO' },
      { task_id: 'tsk_other', evidence_type: 'AFTER_PHOTO' },
    ] satisfies EvidenceRecord[]).ok,
    expected: false,
  },

  // --- 工事パッケージ（着手可否） ---
  {
    group: '工事パッケージ',
    name: '未承認タスクが1件でもあると現場着手できない',
    actual: canReleaseWorkPackage([task(), task({ classification_snapshot: cls({ status: 'REVIEW_REQUIRED' }) })], ACTIVE).ok,
    expected: false,
  },
  {
    group: '工事パッケージ',
    name: '全て承認済みなら現場着手できる',
    actual: canReleaseWorkPackage([task(), task()], ACTIVE).ok,
    expected: true,
  },
  {
    group: '工事パッケージ',
    name: '区分版がACTIVEでないと現場着手できない',
    actual: canReleaseWorkPackage([task()], DRAFT_VER).ok,
    expected: false,
  },
  {
    group: '工事パッケージ',
    name: '資格者チェックポイントが未承認なら完工できない',
    actual: canCompleteWorkPackage([done, cp], []).ok,
    expected: false,
  },
  {
    group: '工事パッケージ',
    name: 'チェックポイントが承認済みなら完工できる',
    actual: canCompleteWorkPackage([done, cp], [{ task_id: 'tsk_cp', decision: 'APPROVED' }]).ok,
    expected: true,
  },
  {
    group: '工事パッケージ',
    name: '未完了タスクが残っていると完工できない',
    actual: canCompleteWorkPackage(
      [done, cp, task({ status: 'IN_PROGRESS' })],
      [{ task_id: 'tsk_cp', decision: 'APPROVED' }],
    ).ok,
    expected: false,
  },

  // --- 区分の承認（2段階） ---
  {
    group: '区分の承認（2段階）',
    name: '技術確認前は区分を承認できない',
    actual: canApproveClassification({ status: 'REVIEW_REQUIRED' }).ok,
    expected: false,
  },
  {
    group: '区分の承認（2段階）',
    name: '技術確認後は区分を承認できる',
    actual: canApproveClassification({
      status: 'REVIEW_REQUIRED',
      tech_reviewed_at: '2026-07-01T00:00:00Z',
      tech_decision: 'ASSISTANT_ALLOWED',
    }).ok,
    expected: true,
  },
  {
    group: '区分の承認（2段階）',
    name: '技術責任者が「判断できない」なら承認できない',
    actual: canApproveClassification({
      status: 'REVIEW_REQUIRED',
      tech_reviewed_at: '2026-07-01T00:00:00Z',
      tech_decision: 'CANNOT_JUDGE',
    }).ok,
    expected: false,
  },

  // --- 契約・指揮命令の判定 ---
  {
    group: '契約・指揮命令の判定',
    name: '8項目すべて問題なければ確認済みになる',
    actual: evaluateLabor(okAnswers).status,
    expected: 'CONFIRMED',
  },
  {
    group: '契約・指揮命令の判定',
    name: '未回答があればHOLD',
    actual: evaluateLabor({ ...okAnswers, safety: undefined }).status,
    expected: 'HOLD',
  },
  {
    group: '契約・指揮命令の判定',
    name: '「不明」があればHOLD',
    actual: evaluateLabor({ ...okAnswers, direction: '不明' }).status,
    expected: 'HOLD',
  },
  {
    group: '契約・指揮命令の判定',
    name: '施工会社以外が雇用する形はHOLD',
    actual: evaluateLabor({ ...okAnswers, employer: '電池屋が雇用' }).status,
    expected: 'HOLD',
  },
  {
    group: '契約・指揮命令の判定',
    name: '指揮命令が施工会社でなければHOLD',
    actual: evaluateLabor({ ...okAnswers, direction: '電池屋' }).status,
    expected: 'HOLD',
  },
  {
    group: '契約・指揮命令の判定',
    name: '許可・登録を満たさなければHOLD',
    actual: evaluateLabor({ ...okAnswers, license: '満たさない' }).status,
    expected: 'HOLD',
  },
  {
    group: '契約・指揮命令の判定',
    name: '外注先が独立して人員配置できないならHOLD',
    actual: evaluateLabor({ ...okAnswers, independence: 'できない' }).status,
    expected: 'HOLD',
  },
  {
    group: '契約・指揮命令の判定',
    name: '瑕疵の責任が施工会社になければHOLD',
    actual: evaluateLabor({ ...okAnswers, liability: '電池屋' }).status,
    expected: 'HOLD',
  },

  // --- KPI ---
  {
    group: 'KPI',
    name: '1台当たり資格者時間 = 540分 ÷ 60台',
    actual: k.qualifiedMinutesPerUnit,
    expected: 9,
  },
  {
    group: 'KPI',
    name: '資格者生産倍率 = 60台 ÷ 9時間',
    actual: k.qualifiedProductivity,
    expected: 6.67,
  },
  {
    group: 'KPI',
    name: '手戻り率 = 1件 ÷ 2件',
    actual: k.reworkRate,
    expected: 50,
  },
  {
    group: 'KPI',
    name: 'アシスタント移管率 = 420分 ÷ 1110分',
    actual: k.assistantShift,
    expected: 37.8,
  },
]
