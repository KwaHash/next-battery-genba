import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/config'
import { type Database } from '@/types/database'

/**
* Client on the trading company side (server). Does not go through RLS.
*
* > The on-site client must not write the answer.
* > The on-site side can only proceed up to SENT.
* > The transition to ANSWERED and the generation of the answer are only for those that have passed canAutoAnswer on the server side.
*
* Do not extend this client to other uses. If you do, the 5 conditions and exclusion of security equipment will no longer work.
*/
export function createAdminClient() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY が設定されていません。回答の生成はサーバ側でのみ行えます。',
    )
  }

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
