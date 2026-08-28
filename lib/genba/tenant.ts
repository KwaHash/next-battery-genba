import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type Session = {
  userId: string;
  email: string | null;
  tenantId: string;
  role: 'owner' | 'manager' | 'member';
  actor: string;
}

export async function getSession(): Promise<Session | null> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: membership } = await supabase
    .from('memberships')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (!membership) return null

  return {
    userId: user.id,
    email: user.email ?? null,
    tenantId: membership.tenant_id,
    role: membership.role,
    actor: user.email ?? user.id,
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}
