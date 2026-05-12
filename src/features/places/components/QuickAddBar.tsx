import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/shared/ui/Icon/Icon'
import { useAddPlace } from '../AddPlaceContext'
import { searchRestaurantBase } from '../services/restaurantBaseService'
import type { RestaurantBaseResult } from '../types'
import styles from './QuickAddBar.module.css'

export function QuickAddBar() {
  const { open } = useAddPlace()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<RestaurantBaseResult[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const result = await searchRestaurantBase({
          query: query.trim(),
          max_resultados: 5,
        })
        setSuggestions(result.items ?? [])
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setFocused(false)
      }
    }
    if (focused) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [focused])

  function handlePick(suggestion: RestaurantBaseResult) {
    open({
      initialMode: 'base',
      initialBaseRestaurantId: suggestion.restaurante.id,
      initialQuery: suggestion.restaurante.nome,
    })
    setQuery('')
    setFocused(false)
  }

  function handleQuickAddClick() {
    open({ initialMode: 'base', initialQuery: query })
    setQuery('')
    setFocused(false)
  }

  const showDropdown = focused && (loading || suggestions.length > 0 || query.trim().length >= 2)
  const visibleSuggestions = suggestions

  return (
    <div className={styles.wrap} ref={containerRef}>
      <div className={`${styles.bar} ${focused ? styles.barFocused : ''}`}>
        <span className={styles.bar__pin} aria-hidden="true">
          <Icon name="book-open" size={20} />
        </span>
        <input
          className={styles.bar__input}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Busque na base para adicionar rápido..."
          type="search"
          value={query}
        />
        <button className={styles.bar__cta} onClick={handleQuickAddClick} type="button">
          <Icon name="bolt" size={14} />
          Adição rápida
        </button>
        <button
          aria-label="Sobre essa busca"
          className={styles.bar__hint}
          onClick={() => open({ initialMode: 'manual' })}
          type="button"
        >
          <Icon name="plus" size={14} />
        </button>
      </div>

      {showDropdown ? (
        <div className={styles.dropdown}>
          {loading ? (
            <p className={styles.dropdownEmpty}>Buscando lugares...</p>
          ) : visibleSuggestions.length === 0 ? (
            <p className={styles.dropdownEmpty}>
              Nada por aqui. Tente outro termo ou cadastre manualmente.
            </p>
          ) : (
            <ul className={styles.dropdownList}>
              {visibleSuggestions.map((item) => (
                <li key={item.restaurante.id}>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => handlePick(item)}
                    type="button"
                  >
                    <span className={styles.dropdownItemMain}>
                      {item.restaurante.nome}
                    </span>
                    {item.restaurante.tipo || item.restaurante.bairro ? (
                      <span className={styles.dropdownItemSub}>
                        {[item.restaurante.tipo, item.restaurante.bairro].filter(Boolean).join(' · ')}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
