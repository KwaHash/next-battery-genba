// タスク割当・開始・完了申請の可否判定（ドメインルールの中核）。
// 画面はこの関数群を経由して可否を決める。画面側でif文を書き足さないこと。

import { type LaborStatus } from '@/lib/domain/labor-check'
import {
  BLOCKING_CLASSIFICATIONS,
  CLASSIFICATION,
  EVIDENCE,
  type EvidenceType,
  ROLE,
  ROLE_ALLOWED_CLASSIFICATIONS,
  TASK_STATUS as TASK_STATUS_LABEL,
  type TaskRecord,
  type UserQualification,
  type UserRecord,
  type ClassificationVersion,
  type TrainingResult,
  activeQualificationCodes,
  isVersionUsable,
  missingCodes,
  passedTrainingCodes,
} from '@/lib/domain/task-classification'

export type GateVerdict = {
  ok: boolean;
  reasons: string[];
}

export type AssignmentContext = {
  userQualifications: UserQualification[];
  trainingResults: TrainingResult[];
  version: ClassificationVersion | null | undefined;
  labor: LaborStatus | null | undefined;
}

/** 割当可否。区分／版がACTIVE／役割／資格の有効期限／教育の修了／ゲート2（契約・指揮命令）を見る。 */
export function canAssign(user: UserRecord, task: TaskRecord, ctx: AssignmentContext): GateVerdict {
  const reasons: string[] = []
  const cls = task.classification_snapshot

  if (BLOCKING_CLASSIFICATIONS.includes(cls.status)) {
    reasons.push(`タスク区分が「${CLASSIFICATION[cls.status].label}」のため割当できません`)
  }
  if (!isVersionUsable(ctx.version)) {
    reasons.push('タスク区分版が有効（ACTIVE）ではありません')
  }

  const allowed = ROLE_ALLOWED_CLASSIFICATIONS[user.role] || []
  if (!allowed.includes(cls.status)) {
    reasons.push(`${ROLE[user.role]}は「${CLASSIFICATION[cls.status].label}」を担当できません`)
  }

  const quals = activeQualificationCodes(ctx.userQualifications, user.id)
  const missQual = missingCodes(cls.required_qualification_codes, quals)
  if (missQual.length) {
    reasons.push(`必要資格が不足または失効：${missQual.join(', ')}`)
  }

  const trainings = passedTrainingCodes(ctx.trainingResults, user.id)
  const missTrain = missingCodes(cls.required_training_codes, trainings)
  if (missTrain.length) {
    reasons.push(`必要教育が未修了または失効：${missTrain.join(', ')}`)
  }

  // ゲート2：現場にアシスタントを立てるなら、契約・指揮命令が確認済みであること
  const onSite = (cls.allowed_location_type || []).includes('SITE')
  if (user.role === 'assistant' && onSite && ctx.labor !== 'CONFIRMED') {
    reasons.push('契約・指揮命令構造が未確認のため、現場でのアシスタント配置はHOLDです')
  }

  return { ok: reasons.length === 0, reasons }
}

/** 開始可否。割当時に通っていても、開始時に必ず再判定する（資格が後から失効するため）。 */
export function canStart(user: UserRecord, task: TaskRecord, ctx: AssignmentContext): GateVerdict {
  const result = canAssign(user, task, ctx)
  const reasons = [...result.reasons]

  // 未割当のまま開始させない。誰でも始められると、チーム編成の判断（資格者を温存する順など）を
  // 飛ばせてしまい、「誰が割り当てたか」も監査に残らない。
  // 現場で手を挙げる運用は、割当操作として記録してから開始する。
  if (!task.assigned_user_id) {
    reasons.push('担当が決まっていません。先に自分へ割り当ててください')
  } else if (task.assigned_user_id !== user.id) {
    reasons.push('自分に割り当てられたタスクではありません')
  }

  const startable: TaskRecord['status'][] = ['READY', 'ASSIGNED', 'BLOCKED', 'REWORK_REQUIRED']
  if (!startable.includes(task.status)) {
    reasons.push(`現在の状態（${TASK_STATUS_LABEL[task.status]}）からは開始できません`)
  }

  return { ok: reasons.length === 0, reasons }
}

/** 作業者にタスク詳細を見せてよいか。アシスタントには資格者限定タスクの詳細・開始手段を出さない。 */
export function isTaskVisibleTo(user: UserRecord, task: TaskRecord): boolean {
  if (user.role === 'admin' || user.role === 'manager' || user.role === 'reviewer') return true
  const allowed = ROLE_ALLOWED_CLASSIFICATIONS[user.role] || []
  return allowed.includes(task.classification_snapshot.status)
}

export type EvidenceRecord = {
  task_id: string;
  evidence_type: EvidenceType;
  superseded_by?: string | null;
}

export type SubmitVerdict = {
  ok: boolean;
  missing: EvidenceType[];
  reasons: string[];
}

/** 完了申請可否。必須証跡が揃っていなければ申請できない。 */
export function canSubmit(task: TaskRecord, evidences: EvidenceRecord[]): SubmitVerdict {
  const required = task.classification_snapshot.required_evidence_types || []
  const have = evidences.filter((e) => e.task_id === task.id && !e.superseded_by).map((e) => e.evidence_type)
  const lack = missingCodes(required, have) as EvidenceType[]

  return {
    ok: lack.length === 0 && task.status === 'IN_PROGRESS',
    missing: lack,
    reasons: lack.length
      ? [`必須証跡が不足：${lack.map((c) => EVIDENCE[c] || c).join(', ')}`]
      : task.status === 'IN_PROGRESS'
        ? []
        : ['作業中のタスクだけが完了申請できます'],
  }
}

export type ClassificationApproval = {
  status: string;
  tech_reviewed_at?: string | null;
  tech_decision?: string | null;
}

/** 区分を承認できるか。技術責任者の技術・安全確認が先。法令・安全レビュー担当が単独で確定しない。 */
export function canApproveClassification(c: ClassificationApproval): GateVerdict {
  const reasons: string[] = []
  if (!c.tech_reviewed_at) {
    reasons.push('技術責任者の技術・安全確認が未了です')
  }
  if (c.tech_decision === 'CANNOT_JUDGE') {
    reasons.push('技術責任者が「判断できない」としています。動作単位まで分解して再提出してください')
  }
  return { ok: reasons.length === 0, reasons }
}

export type ReleaseVerdict = GateVerdict & { blockedTasks: TaskRecord[] }

/** 工事パッケージを READY にできるか。未承認タスクが1つでもあれば現場作業を開始できない。 */
export function canReleaseWorkPackage(
  tasks: TaskRecord[],
  version: ClassificationVersion | null | undefined,
): ReleaseVerdict {
  const reasons: string[] = []
  const blocked = tasks.filter((t) => BLOCKING_CLASSIFICATIONS.includes(t.classification_snapshot.status))
  if (blocked.length) {
    reasons.push(`未承認・禁止のタスクが ${blocked.length} 件あります：${blocked.map((t) => t.title).join(' / ')}`)
  }
  if (!isVersionUsable(version)) {
    reasons.push(`タスク区分版が ACTIVE ではありません（現在：${version ? version.state : '不明'}）`)
  }
  return { ok: reasons.length === 0, reasons, blockedTasks: blocked }
}

export type WorkPackageApproval = {
  task_id: string;
  decision: string;
}

/** 工事パッケージを完了にできるか。資格者チェックポイントが未承認なら完了できない。 */
export function canCompleteWorkPackage(tasks: TaskRecord[], approvals: WorkPackageApproval[]): GateVerdict {
  const reasons: string[] = []
  const checkpoints = tasks.filter((t) => t.classification_snapshot.is_checkpoint)
  const unapproved = checkpoints.filter(
    (t) => !approvals.some((a) => a.task_id === t.id && a.decision === 'APPROVED'),
  )
  if (unapproved.length) {
    reasons.push(`資格者承認が未了のチェックポイント：${unapproved.map((t) => t.title).join(' / ')}`)
  }
  const open = tasks.filter((t) => t.status !== 'APPROVED_COMPLETE')
  if (open.length) {
    reasons.push(`未完了タスクが ${open.length} 件あります`)
  }
  return { ok: reasons.length === 0, reasons }
}
