import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/shared/ui/Icon/Icon'
import { useAddPlace } from '../AddPlaceContext'
import { autocompletePlaces } from '../services/googleMapsService'
import type { GoogleAutocompleteSuggestion } from '../types'
import styles from './QuickAddBar.module.css'

export function QuickAddBar() {
  const { open } = useAddPlace()
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<GoogleAutocompleteSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionTokenRef = useRef<string>(crypto.randomUUID())

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const result = await autocompletePlaces({
          input: query.trim(),
          included_primary_types: ['restaurant', 'food', 'cafe', 'bakery', 'bar'],
          session_token: sessionTokenRef.current,
          max_results: 5,
          include_query_predictions: false,
        })
        setSuggestions(result.suggestions ?? [])
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

  function handlePick(suggestion: GoogleAutocompleteSuggestion) {
    if (!suggestion.place_id) return
    open({
      initialMode: 'google',
      initialPlaceId: suggestion.place_id,
      initialQuery: suggestion.main_text?.text ?? query,
    })
    setQuery('')
    setFocused(false)
    sessionTokenRef.current = crypto.randomUUID()
  }

  function handleQuickAddClick() {
    open({ initialMode: 'google', initialQuery: query })
    setQuery('')
    setFocused(false)
  }

  const showDropdown = focused && (loading || suggestions.length > 0 || query.trim().length >= 2)
  const visibleSuggestions = suggestions.filter((s) => s.type === 'place' && s.place_id)

  return (
    <div className={styles.wrap} ref={containerRef}>
      <div className={`${styles.bar} ${focused ? styles.barFocused : ''}`}>
        <span className={styles.bar__pin} aria-hidden="true">
          <GoogleMapsPin />
        </span>
        <input
          className={styles.bar__input}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Busque no Google Maps para adicionar rápido..."
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
                <li key={item.place_id}>
                  <button
                    className={styles.dropdownItem}
                    onClick={() => handlePick(item)}
                    type="button"
                  >
                    <span className={styles.dropdownItemMain}>
                      {item.main_text?.text ?? item.text?.text}
                    </span>
                    {item.secondary_text?.text ? (
                      <span className={styles.dropdownItemSub}>{item.secondary_text.text}</span>
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

function GoogleMapsPin() {
  return (
    <svg
      aria-hidden="true"
      height="22"
      viewBox="0 0 24 24"
      width="22"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 22s7-7.07 7-12.5a7 7 0 1 0-14 0C5 14.93 12 22 12 22Z"
        fill="#ea4335"
      />
      <circle cx="12" cy="9.5" r="2.7" fill="#fff" />
    </svg>
  )
}
