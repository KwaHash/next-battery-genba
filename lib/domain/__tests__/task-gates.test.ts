// ドメインルールの自己テスト。
// 画面（app/selftest）と共有しており、ここではその結果を検証するだけ。

import { describe, expect, it } from 'vitest'
import { selfTestCases } from '@/lib/domain/self-test-cases'

const groups = new Map<string, typeof selfTestCases>()
for (const testCase of selfTestCases) {
  const cases = groups.get(testCase.group) ?? []
  cases.push(testCase)
  groups.set(testCase.group, cases)
}

Array.from(groups.entries()).forEach(([group, cases]) => {
  describe(group, () => {
    it.each(cases)('$name', ({ actual, expected }) => {
      expect(actual).toEqual(expected)
    })
  })
})
