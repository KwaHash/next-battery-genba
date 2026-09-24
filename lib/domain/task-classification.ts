import { type Clock, type IsoDate, systemClock, today } from '@/lib/domain/clock'

export type ClassificationStatus =
  | 'QUALIFIED_ONLY'
  | 'ASSISTANT_ALLOWED'
  | 'PREASSEMBLY_ONLY'
  | 'LOGISTICS_ONLY'
  | 'REVIEW_REQUIRED'
  | 'PROHIBITED'

export const CLASSIFICATION: Record<ClassificationStatus, { label: string; tone: string }> = {
  QUALIFIED_ONLY: { label: '資格者のみ', tone: 'qualified' },
  ASSISTANT_ALLOWED: { label: 'アシスタント可', tone: 'assistant' },
  PREASSEMBLY_ONLY: { label: 'プレアッセンブリ', tone: 'pre' },
  LOGISTICS_ONLY: { label: '物流のみ', tone: 'logi' },
  REVIEW_REQUIRED: { label: '未承認（実施禁止）', tone: 'danger' },
  PROHIBITED: { label: '禁止', tone: 'danger' },
}

// レビュー未了・禁止は、どの役割にも割当できない（安全側）
export const BLOCKING_CLASSIFICATIONS: ClassificationStatus[] = ['REVIEW_REQUIRED', 'PROHIBITED']

export type TaskStatus =
  | 'DRAFT'
  | 'REVIEW_REQUIRED'
  | 'APPROVED'
  | 'ASSIGNED'
  | 'READY'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'SUBMITTED'
  | 'REWORK_REQUIRED'
  | 'APPROVED_COMPLETE'

export const TASK_STATUS: Record<TaskStatus, string> = {
  DRAFT: '下書き',
  REVIEW_REQUIRED: '区分未承認',
  APPROVED: '承認済',
  ASSIGNED: '割当済',
  READY: '着手可',
  IN_PROGRESS: '作業中',
  BLOCKED: '停止中',
  SUBMITTED: '完了申請',
  REWORK_REQUIRED: '差戻し',
  APPROVED_COMPLETE: '完了',
}

export type EvidenceType =
  | 'BEFORE_PHOTO'
  | 'AFTER_PHOTO'
  | 'MEASUREMENT'
  | 'CHECKLIST'
  | 'DOCUMENT'
  | 'COMMENT'
  | 'INCIDENT'

export const EVIDENCE: Record<EvidenceType, string> = {
  BEFORE_PHOTO: '作業前写真',
  AFTER_PHOTO: '作業後写真',
  MEASUREMENT: '測定値',
  CHECKLIST: 'チェック',
  DOCUMENT: '書類',
  COMMENT: 'コメント',
  INCIDENT: '異常報告',
}

export type Role =
  | 'admin'
  | 'manager'
  | 'electrician'
  | 'assistant'
  | 'preassembly'
  | 'tech_lead'
  | 'reviewer'
  | 'customer'

export const ROLE: Record<Role, string> = {
  admin: '運営管理者',
  manager: '施工会社管理者',
  electrician: '電気工事士',
  assistant: '施工アシスタント',
  preassembly: 'プレアッセンブリ担当',
  tech_lead: '技術責任者',
  reviewer: '法令・安全レビュー担当',
  customer: '発注企業担当者',
}

// 役割が担える区分。肩書きだけで許可せず、資格・教育判定と両方を満たす必要がある。
export const ROLE_ALLOWED_CLASSIFICATIONS: Record<Role, ClassificationStatus[]> = {
  electrician: ['QUALIFIED_ONLY', 'ASSISTANT_ALLOWED', 'PREASSEMBLY_ONLY', 'LOGISTICS_ONLY'],
  assistant: ['ASSISTANT_ALLOWED', 'LOGISTICS_ONLY'],
  preassembly: ['PREASSEMBLY_ONLY', 'LOGISTICS_ONLY'],
  manager: [],
  admin: [],
  tech_lead: [],
  reviewer: [],
  customer: [],
}

export type LocationType = 'SITE' | 'PREASSEMBLY_CENTER'

export type TaskClassificationSnapshot = {
  status: ClassificationStatus;
  required_qualification_codes: string[];
  required_training_codes: string[];
  required_evidence_types: EvidenceType[];
  allowed_location_type: LocationType[];
  energization_condition?: string;
  supervision_type?: string;
  is_checkpoint: boolean;
}

export type TaskRecord = {
  id: string;
  status: TaskStatus;
  assigned_user_id: string | null;
  title: string;
  classification_snapshot: TaskClassificationSnapshot;
  rework_count?: number;
}

export type UserRecord = {
  id: string;
  role: Role;
  name?: string;
}

export type ClassificationVersion = {
  state: string;
}

export type UserQualification = {
  user_id: string;
  code: string;
  verified_at: string | null;
  expires_on: IsoDate | null;
  // 免状の取消・停止。期限切れとは別に、いずれか一方でも入っていたら使えない（安全側）
  revoked_at?: string | null;
  suspended_at?: string | null;
}

export type TrainingResult = {
  user_id: string;
  code: string;
  passed: boolean;
  expires_on: IsoDate | null;
}

// 有効な資格。期限切れ・取消・停止のいずれでもなければ有効。
export function activeQualificationCodes(
  userQuals: UserQualification[],
  userId: string,
  clock: Clock = systemClock,
): string[] {
  return userQuals
    .filter(
      (q) =>
        q.user_id === userId &&
        q.verified_at &&
        !q.revoked_at &&
        !q.suspended_at &&
        (!q.expires_on || q.expires_on >= today(0, clock)),
    )
    .map((q) => q.code)
}

export function passedTrainingCodes(
  results: TrainingResult[],
  userId: string,
  clock: Clock = systemClock,
): string[] {
  return results
    .filter((t) => t.user_id === userId && t.passed && (!t.expires_on || t.expires_on >= today(0, clock)))
    .map((t) => t.code)
}

export function missingCodes(required: string[] | undefined, held: string[]): string[] {
  return (required || []).filter((c) => !held.includes(c))
}

// 版が新規案件へ適用できるか。ACTIVE のみ。
export function isVersionUsable(version: ClassificationVersion | null | undefined): boolean {
  return !!version && version.state === 'ACTIVE'
}
