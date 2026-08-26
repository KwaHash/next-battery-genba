'use client'

import { useEffect, useState } from 'react'
import { type SupabaseClient } from '@supabase/supabase-js'
import { LogIn, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Notice } from '@/components/genba/notice'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { type Database } from '@/types/database'

async function hasMembership(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('memberships')
    .select('tenant_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  return Boolean(data)
}

export default function LoginContent() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [noTenant, setNoTenant] = useState(false)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const linked = await hasMembership(supabase, user.id)
      if (!cancelled) setNoTenant(!linked)
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const signOut = async () => {
    setPending(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    setNoTenant(false)
    setPending(false)
    router.refresh()
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setPending(true)
    setError(null)
    setNoTenant(false)

    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError('メールアドレスかパスワードが違います')
      setPending(false)
      return
    }

    if (data.user && !(await hasMembership(supabase, data.user.id))) {
      setNoTenant(true)
      setPending(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-4 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">現場アシスト</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          工事会社が毎日開く画面
        </p>
      </div>

      {noTenant ? (
        <Notice
          variant="warning"
          title="まだ会社に紐づいていません"
          lines={[
            'サインインはできましたが、このアカウントはどの会社にも登録されていません。',
            '社内の担当者へご連絡ください。',
          ]}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>サインイン</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                required
                className="min-h-12 text-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="min-h-12 text-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error ? (
              <Notice variant="destructive" title="入れませんでした" lines={[error]} />
            ) : null}

            <Button type="submit" size="field" disabled={pending}>
              <LogIn className="mr-2 size-5" aria-hidden />
              {pending ? '確認しています…' : 'サインイン'}
            </Button>
          </form>

          {noTenant ? (
            <Button
              variant="outline"
              size="field"
              className="mt-3"
              disabled={pending}
              onClick={signOut}
            >
              <LogOut className="mr-2 size-5" aria-hidden />
              別のアカウントで入り直す
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Notice
        variant="info"
        title="アカウントは発行制です"
        lines={[
          '入れないときは、社内の担当者へご連絡ください。',
          'この画面は招待された方だけが使えます。',
        ]}
      />
    </div>
  )
}
