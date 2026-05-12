import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import {
  saveBaseRestaurant,
  searchRestaurantBase,
} from '@/features/places/services/restaurantBaseService'
import type { RestaurantBaseResult } from '@/features/places/types'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { FeedbackState } from '@/shared/ui/FeedbackState/FeedbackState'
import { Icon } from '@/shared/ui/Icon/Icon'
import { PageHeader } from '@/shared/ui/PageHeader/PageHeader'
import styles from './NearbyRestaurantsPage.module.css'

const quickSearches = [
  'japonesa pinheiros',
  'italiana jardins',
  'bar vinho',
  'cafe brunch',
  'date romantico',
  'vegetariano',
]

function getResultMeta(result: RestaurantBaseResult) {
  const restaurant = result.restaurante
  return [restaurant.tipo, restaurant.bairro, restaurant.cidade].filter(Boolean).join(' / ')
}

function getSourceLabel(result: RestaurantBaseResult) {
  const restaurant = result.restaurante
  return restaurant.distincao ?? restaurant.categoria
}

export function NearbyRestaurantsPage() {
  const { grupo, perfil } = useAuth()
  const [query, setQuery] = useState('japonesa pinheiros')
  const [results, setResults] = useState<RestaurantBaseResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [busyRestaurantId, setBusyRestaurantId] = useState<string | null>(null)
  const [savedRestaurantIds, setSavedRestaurantIds] = useState<Set<string>>(() => new Set())
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const categorySummary = useMemo(
    () =>
      Array.from(
        new Set(
          results
            .map((item) => item.restaurante.categoria)
            .filter((category): category is string => Boolean(category)),
        ),
      ).slice(0, 4),
    [results],
  )

  async function runSearch(nextQuery = query) {
    const trimmedQuery = nextQuery.trim()
    if (trimmedQuery.length < 2) {
      setErrorMessage('Digite pelo menos 2 caracteres para buscar na base.')
      return
    }

    setQuery(nextQuery)
    setErrorMessage(null)
    setHasSearched(true)
    setIsLoading(true)

    try {
      const response = await searchRestaurantBase({
        query: trimmedQuery,
        max_resultados: 18,
      })
      setResults(response.items)
    } catch (error: unknown) {
      setResults([])
      setErrorMessage(getErrorMessage(error, 'Nao foi possivel buscar na base agora.'))
    } finally {
      setIsLoading(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void runSearch()
  }

  function handleQuickSearch(nextQuery: string) {
    void runSearch(nextQuery)
  }

  async function handleSave(result: RestaurantBaseResult) {
    if (!grupo) {
      setErrorMessage('Selecione um grupo antes de salvar restaurantes.')
      return
    }

    const restaurantId = result.restaurante.id
    setBusyRestaurantId(restaurantId)
    setErrorMessage(null)

    try {
      await saveBaseRestaurant(grupo.id, {
        added_by_profile_id: perfil?.id,
        restaurante_id: restaurantId,
        status: 'quero_ir',
      })
      setSavedRestaurantIds((current) => new Set(current).add(restaurantId))
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Nao foi possivel salvar esse restaurante.'))
    } finally {
      setBusyRestaurantId(null)
    }
  }

  const shouldShowInitialEmpty = !hasSearched && !isLoading && !errorMessage
  const shouldShowSearchEmpty = hasSearched && !isLoading && results.length === 0 && !errorMessage

  return (
    <section className={styles.page}>
      <PageHeader
        action={<span className={styles.pageBadge}>Base propria</span>}
        description="Pesquise a base curada do Comidinhas, confira os detalhes disponiveis e salve o restaurante no grupo sem depender do Google Maps."
        eyebrow="Explorar restaurantes"
        title="Descubra lugares direto da nossa base."
      />

      <section className={`surfaceCard ${styles.spotlight}`}>
        <div className={styles.spotlightCopy}>
          <span className={styles.spotlightLabel}>Busca curada</span>
          <h2 className={styles.spotlightTitle}>Use nome, cozinha, bairro ou clima do encontro.</h2>
        </div>

        <div className={styles.presetRow}>
          {quickSearches.map((preset) => (
            <button
              key={preset}
              className={styles.presetButton}
              onClick={() => handleQuickSearch(preset)}
              type="button"
            >
              {preset}
            </button>
          ))}
        </div>
      </section>

      <div className={styles.layout}>
        <form className={`surfaceCard ${styles.searchPanel}`} onSubmit={handleSubmit}>
          <label className={styles.searchBox}>
            <Icon name="search" size={18} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex: arabe, Pinheiros, brunch..."
              type="search"
              value={query}
            />
          </label>

          <button className={styles.searchButton} disabled={isLoading} type="submit">
            {isLoading ? 'Buscando...' : 'Buscar na base'}
            <Icon name="arrow-right" size={15} />
          </button>

          <div className={styles.hintRow}>
            <span>
              <Icon name="book-open" size={14} />
              {results.length || '398'} restaurantes indexados
            </span>
            <span>
              <Icon name="globe" size={14} />
              Sao Paulo
            </span>
          </div>

          {categorySummary.length > 0 ? (
            <div className={styles.categoryRow}>
              {categorySummary.map((category) => (
                <span key={category} className={styles.categoryPill}>
                  {category}
                </span>
              ))}
            </div>
          ) : null}
        </form>

        <section className={`surfaceCard ${styles.resultsPanel}`}>
          <div className={styles.resultsHeader}>
            <div>
              <h2 className={styles.resultsTitle}>Resultados</h2>
              <p className={styles.resultsDescription}>
                A lista vem do endpoint de restaurantes-base e ja esta pronta para salvar no grupo.
              </p>
            </div>

            {results.length > 0 ? (
              <span className="statusPill" data-tone="sage">
                {results.length} lugar(es)
              </span>
            ) : null}
          </div>

          {errorMessage ? (
            <FeedbackState
              description={errorMessage}
              title="A busca nao foi concluida"
              variant="error"
            />
          ) : null}

          {isLoading ? (
            <FeedbackState
              description="Estamos consultando a base local e ranqueando os melhores matches."
              title="Buscando restaurantes"
              variant="loading"
            />
          ) : null}

          {shouldShowInitialEmpty ? (
            <FeedbackState
              description="Use a busca ou os atalhos para encontrar restaurantes da base propria."
              title="Pronto para explorar"
              variant="empty"
            />
          ) : null}

          {shouldShowSearchEmpty ? (
            <FeedbackState
              description="Nenhum restaurante encontrado. Tente uma cozinha, bairro ou nome mais amplo."
              title="Nada encontrado"
              variant="empty"
            />
          ) : null}

          {results.length > 0 && !isLoading ? (
            <div className={styles.resultsList}>
              {results.map((result) => {
                const restaurant = result.restaurante
                const saved = savedRestaurantIds.has(restaurant.id)
                const busy = busyRestaurantId === restaurant.id

                return (
                  <article className={styles.resultCard} key={restaurant.id}>
                    <div className={styles.resultTop}>
                      <span className={styles.sourceLine}>
                        <Icon name="book-open" size={13} />
                        {getSourceLabel(result)}
                      </span>
                      <span className={styles.scoreBadge}>{Math.round(result.score)} pts</span>
                    </div>

                    <h3 className={styles.resultName}>{restaurant.nome}</h3>
                    <p className={styles.resultMeta}>
                      <Icon name="pin" size={14} />
                      {restaurant.endereco ?? getResultMeta(result)}
                    </p>

                    {restaurant.descricao ? (
                      <p className={styles.resultDescription}>{restaurant.descricao}</p>
                    ) : result.trechos[0] ? (
                      <p className={styles.resultDescription}>{result.trechos[0]}</p>
                    ) : null}

                    <div className={styles.resultFooter}>
                      <span>{getResultMeta(result) || 'Sao Paulo'}</span>
                      <button
                        className={saved ? styles.savedButton : styles.saveButton}
                        disabled={busy || saved}
                        onClick={() => void handleSave(result)}
                        type="button"
                      >
                        <Icon name={saved ? 'circle-check' : 'plus'} size={15} />
                        {saved ? 'Salvo' : busy ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>
      </div>
    </section>
  )
}
