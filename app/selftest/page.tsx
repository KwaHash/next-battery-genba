import { type Metadata } from 'next'
import { StatusBadge } from '@/components/genba/status-badge'
import { TopBar } from '@/components/genba/top-bar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { selfTestCases } from '@/lib/domain/self-test-cases'

export const metadata: Metadata = {
  title: 'ドメインルール自己テスト｜現場アシスト',
  robots: { index: false, follow: false },
}

export default function SelfTestPage() {
  const results = selfTestCases.map((testCase) => ({
    ...testCase,
    ok: JSON.stringify(testCase.actual) === JSON.stringify(testCase.expected),
  }))

  const failed = results.filter((r) => !r.ok)
  const groups = new Map<string, typeof results>()
  for (const result of results) {
    const cases = groups.get(result.group) ?? []
    cases.push(result)
    groups.set(result.group, cases)
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="ドメインルール自己テスト" backTo="/" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Alert variant={failed.length ? 'destructive' : 'success'}>
          <AlertTitle className="mb-2">
            {results.length - failed.length} / {results.length} 件 成功
          </AlertTitle>
          <AlertDescription>
            {failed.length ? (
              <ul className="space-y-1">
                {failed.map((r) => (
                  <li key={r.name}>
                    {r.name}（期待 {JSON.stringify(r.expected)} / 実際 {JSON.stringify(r.actual)}）
                  </li>
                ))}
              </ul>
            ) : (
              '本番実装（prototype/_domain.js からの移植）が、仕様どおりの結果を返しています。'
            )}
          </AlertDescription>
        </Alert>

        {Array.from(groups.entries()).map(([group, cases]) => (
          <Card key={group}>
            <CardHeader className="pb-2">
              <CardTitle>{group}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y border-y">
                {cases.map((r) => (
                  <div key={r.name} className="flex items-center gap-3 py-2.5">
                    <StatusBadge tone={r.ok ? 'ok' : 'danger'}>{r.ok ? 'OK' : 'NG'}</StatusBadge>
                    <p className="min-w-0 flex-1 text-sm leading-snug">{r.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
