'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ListRow } from '@/components/genba/list-row'
import { StatusBadge } from '@/components/genba/status-badge'
import { TopBar } from '@/components/genba/top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { today } from '@/lib/domain/clock'
import { addTodo, toggleTodo } from '@/lib/genba/actions'
import { type SiteRow, type TodoRow } from '@/types/database'

const NO_SITE = 'none'

export default function TodoContent({
  todos,
  sites,
}: {
  todos: TodoRow[];
  sites: SiteRow[];
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState('')
  const [siteId, setSiteId] = useState(NO_SITE)

  const siteById = new Map(sites.map((s) => [s.id, s]))
  const open = todos.filter((t) => !t.done)
  const done = todos.filter((t) => t.done)

  function toggle(todo: TodoRow) {
    startTransition(async () => {
      const result = await toggleTodo(todo.id, !todo.done)
      if (result.ok) router.refresh()
      else toast.error(result.reasons[0])
    })
  }

  function add(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      toast.error('内容を入れてください')
      return
    }

    startTransition(async () => {
      const result = await addTodo({
        title: title.trim(),
        siteId: siteId === NO_SITE ? null : siteId,
        due: today(),
      })
      if (result.ok) {
        setTitle('')
        toast.success('追加しました')
        router.refresh()
      } else {
        toast.error(result.reasons[0])
      }
    })
  }

  function row(todo: TodoRow) {
    return (
      <ListRow
        key={todo.id}
        disabled={pending}
        onClick={() => toggle(todo)}
        leading={todo.done ? '☑' : '☐'}
        title={
          <span className={todo.done ? 'text-muted-foreground line-through' : undefined}>
            {todo.title}
          </span>
        }
        meta={
          [todo.site_id ? siteById.get(todo.site_id)?.name : null, todo.due].filter(Boolean).join('／')
        }
        trailing={todo.auto ? <StatusBadge tone="neutral">自動</StatusBadge> : null}
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title="やること" backTo="/" />

      <div className="flex flex-1 flex-col gap-4 p-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>追加</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="todo-title">やること</Label>
                <Input
                  id="todo-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例：脚立を積む"
                  className="min-h-12 text-field"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="todo-site">現場</Label>
                <Select value={siteId} onValueChange={setSiteId}>
                  <SelectTrigger id="todo-site" className="min-h-12 text-field">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SITE}>現場を選ばない</SelectItem>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" size="field" disabled={pending} className='text-white'>
                追加する
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>未完了（{open.length}）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-0 pb-4">
            {open.length ? (
              <div className="divide-y border-y">{open.map(row)}</div>
            ) : (
              <p className="px-4 text-sm text-muted-foreground">ありません。</p>
            )}
            <p className="px-4 text-sm text-muted-foreground">
              「自動」は、発注の着荷予定や、写真がまだ無い現場から自動で出たものです。
              現場で思い出さなくて済むように、前もって出しています。
            </p>
          </CardContent>
        </Card>

        {done.length ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>完了（{done.length}）</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="divide-y border-y">{done.slice(0, 10).map(row)}</div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
