'use client'

import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function CopyButton({
  text,
  label = '転送する',
  title,
  variant = 'outline',
}: {
  text: string;
  label?: string;
  title?: string;
  variant?: 'default' | 'outline';
}) {
  const [done, setDone] = useState(false)

  async function share() {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true)
      toast.success('コピーしました', {
        description: 'そのまま貼り付けて送れます',
      })
      setTimeout(() => setDone(false), 2000)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.error('コピーできませんでした', {
        description: '本文を長押しして選択してください',
      })
    }
  }

  return (
    <Button type="button" variant={variant} size="field" onClick={share} className='text-white'>
      {done ? (
        <Check className="mr-2 size-5" aria-hidden />
      ) : (
        <Share2 className="mr-2 size-5" aria-hidden />
      )}
      {label}
    </Button>
  )
}
