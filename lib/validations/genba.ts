import { z } from 'zod'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日付の形式が正しくありません')

export const materialRequestSchema = z.object({
  productId: z.string().uuid('商品を選んでください'),
  siteId: z.string().uuid('現場を選んでください'),
  qty: z
    .number()
    .int('数量は整数で入れてください')
    .min(1, '数量は1以上です')
    .max(9999, '数量が大きすぎます。分けて依頼してください'),
  needBy: isoDate,
  note: z.string().max(500, 'メモが長すぎます').optional().default(''),
  photoName: z.string().max(200).optional().nullable(),
  idempotencyKey: z.string().min(8, '送信キーが不正です').max(100),
  offline: z.boolean().optional().default(false),
})

export const photoSchema = z.object({
  siteId: z.string().uuid('現場を選んでください'),
  kind: z.enum(['BEFORE', 'AFTER', 'DEFECT'], {
    message: '施工前・施工後・不具合のいずれかを選んでください',
  }),
  area: z.string().min(1, '場所を入れてください').max(100),
  note: z.string().max(300).optional().default(''),
})

export const todoSchema = z.object({
  title: z.string().min(1, '内容を入れてください').max(200),
  siteId: z.string().uuid().optional().nullable(),
  due: isoDate.optional().nullable(),
})

export const helpRequestSchema = z.object({
  packageKey: z.string().min(1, '依頼する作業を選んでください'),
  siteId: z.string().uuid('現場を選んでください'),
})

export const quoteSchema = z.object({
  siteId: z.string().uuid(),
  people: z.number().int().min(1, '人数は1以上です').max(99),
  days: z.number().int().min(1, '日数は1以上です').max(365),
  rate: z.number().int().min(0).max(1_000_000),
  marginPercent: z.number().int().min(0).max(100),
})

export const siteStateSchema = z.object({
  siteId: z.string().uuid(),
  state: z.enum(['NONE', 'ARRIVED', 'WORKING', 'DONE']),
})

export type MaterialRequestInput = z.infer<typeof materialRequestSchema>
export type PhotoInput = z.infer<typeof photoSchema>
export type TodoInput = z.infer<typeof todoSchema>
export type HelpRequestInput = z.infer<typeof helpRequestSchema>
export type QuoteInputValues = z.infer<typeof quoteSchema>
