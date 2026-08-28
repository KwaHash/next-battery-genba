import {
  type CalendarEventRow,
  type RequestItemRow,
  type RequestRow,
  type SettingsRow,
  type SiteRow,
  type TodoRow,
} from '@/types/database'

export type RequestWithItems = RequestRow & {
  items: RequestItemRow[];
}

export type HomeData = {
  sites: SiteRow[];
  events: CalendarEventRow[];
  todos: TodoRow[];
  requests: RequestWithItems[];
  settings: SettingsRow | null;
}

export type FieldNotice = {
  requestId: string;
  kind: string;
  tone: 'ok' | 'warn';
  title: string;
  text: string;
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; reasons: string[] }
