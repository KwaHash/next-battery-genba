import { HELP_LEVEL, type HelpLevel } from '@/lib/domain/labels'

export type HelpPackage = {
  key: string;
  title: string;
  level: HelpLevel;
  qual_label: string;
  unit: string;
  price: number;
  hours: string;
  note: string;
}

export const HELP_PACKAGES: HelpPackage[] = [
  {
    key: 'REPLACE_FIXTURE',
    title: '照明器具の交換（20台）',
    level: 'RED',
    qual_label: '第二種電気工事士',
    unit: '20台',
    price: 90000,
    hours: '1日',
    note: '既設取り外し・結線・点灯確認まで',
  },
  {
    key: 'CARRY_IN',
    title: '器具の搬入・開梱・配置',
    level: 'GREEN',
    qual_label: '教育修了者',
    unit: '60台',
    price: 28000,
    hours: '半日',
    note: '養生と廃材整理を含む',
  },
  {
    key: 'PHOTO_RECORD',
    title: '施工前後の写真撮影と台帳登録',
    level: 'GREEN',
    qual_label: '教育修了者',
    unit: '1現場',
    price: 18000,
    hours: '半日',
    note: '撮影テンプレートに沿って撮影',
  },
  {
    key: 'HOLD_ASSIST',
    title: '器具の保持・取付補助',
    level: 'YELLOW',
    qual_label: '確認中',
    unit: '20台',
    price: 22000,
    hours: '半日',
    note: '「補助」の具体的な動作を確認中。承認されるまで依頼できません',
  },
  {
    key: 'INSULATION_TEST',
    title: '絶縁測定と最終検査',
    level: 'RED',
    qual_label: '第二種電気工事士',
    unit: '1現場',
    price: 35000,
    hours: '2時間',
    note: '測定記録の提出まで',
  },
]

export function findHelpPackage(key: string): HelpPackage | undefined {
  return HELP_PACKAGES.find((p) => p.key === key)
}

export function canRequestHelp(pkg: HelpPackage): { ok: boolean; reasons: string[] } {
  if (!HELP_LEVEL[pkg.level].assignable) {
    return {
      ok: false,
      reasons: [
        '責任者の確認が済むまで依頼できません',
        pkg.note,
      ],
    }
  }
  return { ok: true, reasons: [] }
}
