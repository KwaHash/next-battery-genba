import { type ProductRow } from '@/types/database'

export type ProductCandidate = {
  product: ProductRow;
  /** 確からしさの目安。この値だけで確定させない。 */
  confidence: number;
  reason: string;
}

export function guessProducts(products: ProductRow[], hint: string): ProductCandidate[] {
  const h = (hint || '').toLowerCase().trim()
  const looksLikeLighting = h === '' || /照明|ライト|蛍光|led|ベースライト|器具/.test(h)

  return products
    .map((product) => {
      let score = 0
      if (looksLikeLighting && /ベースライト|TENQOO|LED/i.test(product.name)) score += 3
      if (h && (product.model.toLowerCase().includes(h) || product.name.toLowerCase().includes(h))) {
        score += 5
      }
      if (product.successor_of && h && product.successor_of.toLowerCase().includes(h)) {
        score += 6
      }
      if (product.verified) score += 1
      if (product.stock > 0) score += 1
      return { product, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ product }, i) => ({
      product,
      confidence: i === 0 ? 0.72 : i === 1 ? 0.45 : 0.28,
      reason: product.successor_of
        ? `${product.successor_of} の後継品として登録されています`
        : product.verified
          ? '型番・仕様が確認済みの商品です'
          : '適合は未確認です',
    }))
}
