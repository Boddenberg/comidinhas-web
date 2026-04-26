import type { PriceLevel } from '../types'

const priceLabels: Record<PriceLevel, string> = {
  PRICE_LEVEL_EXPENSIVE: '$$$$',
  PRICE_LEVEL_FREE: 'Gratis',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$$',
}

export function formatOpenNow(openNow?: boolean | null) {
  if (openNow === undefined || openNow === null) {
    return 'Horario indisponivel'
  }

  return openNow ? 'Aberto agora' : 'Fechado no momento'
}

export function formatPriceLevel(priceLevel?: PriceLevel | null) {
  return priceLevel ? priceLabels[priceLevel] : 'Faixa de preco indisponivel'
}

export function formatRating(rating?: number | null, userRatingCount?: number | null) {
  if (rating === undefined || rating === null) {
    return 'Sem avaliacao'
  }

  const reviews =
    userRatingCount === undefined || userRatingCount === null
      ? ''
      : ` - ${new Intl.NumberFormat('pt-BR').format(userRatingCount)} avaliacoes`

  return `${rating.toFixed(1)}${reviews}`
}
