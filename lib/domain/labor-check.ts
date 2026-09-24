// ゲート2：契約・指揮命令（現場でアシスタントを配置してよいか）。
// 資格要否（ゲート1）とは別の判断。両方通って初めて現場でアシスタントを配置できる。
// 設問は要件定義書「7. 契約・指揮命令チェック」に対応。

export type LaborAnswerKey =
  | 'employer'
  | 'direction'
  | 'assignment'
  | 'safety'
  | 'liability'
  | 'independence'
  | 'license'
  | 'insurance'

export type LaborCheck = {
  key: LaborAnswerKey;
  q: string;
  options: string[];
}

export const LABOR_CHECKS: LaborCheck[] = [
  {
    key: 'employer',
    q: 'アシスタントの雇用主は誰か',
    options: ['施工会社が雇用', '電池屋が雇用', '第三者（人材会社等）', '不明'],
  },
  {
    key: 'direction',
    q: '現場で具体的な作業指示をするのは誰か',
    options: ['施工会社', '電池屋', '不明'],
  },
  {
    key: 'assignment',
    q: '作業順序・方法・配置を誰が決めるか',
    options: ['施工会社', '電池屋', '不明'],
  },
  {
    key: 'safety',
    q: '勤怠・安全衛生・保護具・教育・事故対応の責任者は誰か',
    options: ['施工会社', '電池屋', '不明'],
  },
  {
    key: 'liability',
    q: '成果物・瑕疵・再施工の責任は誰が負うか',
    options: ['施工会社', '電池屋', '不明'],
  },
  {
    key: 'independence',
    q: '外注先は独立して業務遂行・人員配置できるか',
    options: ['できる', 'できない', '該当なし（外注しない）', '不明'],
  },
  {
    key: 'license',
    q: '建設業許可・電気工事業登録・主任電気工事士の要件を満たすか',
    options: ['満たす', '満たさない', '不明'],
  },
  {
    key: 'insurance',
    q: '保険の対象者・業務・現場が一致するか',
    options: ['一致する', '一致しない', '不明'],
  },
]

export type LaborAnswers = Partial<Record<LaborAnswerKey, string>>

export type LaborStatus = 'CONFIRMED' | 'HOLD'

export type LaborEvaluation = {
  status: LaborStatus;
  unresolved: string[];
  reasons: string[];
}

// 安全側に倒す：現場でのアシスタント配置を認めるのは、
// 「施工会社が雇用し、施工会社が指揮命令する」形が確認できたときだけ。
export function evaluateLabor(answers: LaborAnswers): LaborEvaluation {
  const a = answers || {}
  const unresolved = LABOR_CHECKS.filter((c) => !a[c.key] || a[c.key] === '不明').map((c) => c.q)

  const reasons = [...unresolved]

  if (a.employer && a.employer !== '不明' && a.employer !== '施工会社が雇用') {
    reasons.push(
      '現場作業のアシスタントを施工会社以外が雇用する形は、' +
        '建設業務への労働者派遣・偽装請負の論点があるためP0では認めません（専門家確認が必要）',
    )
  }
  ;(['direction', 'assignment', 'safety'] as const).forEach((k) => {
    if (a[k] && a[k] !== '不明' && a[k] !== '施工会社') {
      reasons.push(
        `現場の${LABOR_CHECKS.find((c) => c.key === k)!.q}が施工会社ではありません。指揮命令の実態を確認してください`,
      )
    }
  })
  if (a.license === '満たさない') reasons.push('許可・登録の要件を満たしていません')
  if (a.insurance === '一致しない') reasons.push('保険の対象が一致していません')

  // 偽装請負の兆候。値そのもので落とす。
  // 「独立して業務遂行・人員配置できない」「瑕疵の責任が施工会社にない」は、
  // 請負の実態がないことを示す。現場でのアシスタント配置を止める。
  if (a.independence === 'できない') {
    reasons.push('外注先が独立して業務遂行・人員配置できません。請負の実態を確認してください')
  }
  if (a.liability && a.liability !== '不明' && a.liability !== '施工会社') {
    reasons.push('成果物・瑕疵・再施工の責任が施工会社にありません。契約構造を確認してください')
  }

  return {
    status: reasons.length === 0 ? 'CONFIRMED' : 'HOLD',
    unresolved,
    reasons,
  }
}
