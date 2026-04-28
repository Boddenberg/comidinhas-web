import { useEffect, useState } from 'react'
import { Icon } from '@/shared/ui/Icon/Icon'
import { GoogleSearchPanel } from './GoogleSearchPanel'
import { ManualPlaceForm } from './ManualPlaceForm'
import type { Place } from '../types'
import styles from './AddPlace.module.css'

type AddPlaceModalProps = {
  onClose: () => void
  onCreated: (place: Place) => void
  initialQuery?: string
  initialMode?: 'google' | 'manual'
}

export function AddPlaceModal({
  initialMode = 'google',
  initialQuery = '',
  onClose,
  onCreated,
}: AddPlaceModalProps) {
  const [mode, setMode] = useState<'google' | 'manual'>(initialMode)

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        aria-labelledby="add-place-title"
        aria-modal="true"
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className={styles.modalHeader}>
          <div>
            <h2 id="add-place-title" className={styles.modalTitle}>
              Adicionar lugar
            </h2>
            <p className={styles.modalSubtitle}>
              Buscar no Google preenche endereço, foto e categoria. Ou cadastre manualmente.
            </p>
          </div>
          <button
            aria-label="Fechar"
            className={styles.closeButton}
            onClick={onClose}
            type="button"
          >
            <Icon name="x" size={18} />
          </button>
        </header>

        <div className={styles.modeRow} role="tablist">
          <button
            aria-selected={mode === 'google'}
            className={`${styles.modeTab} ${mode === 'google' ? styles.modeActive : ''}`}
            onClick={() => setMode('google')}
            role="tab"
            type="button"
          >
            <Icon name="search" size={15} /> Google Maps
          </button>
          <button
            aria-selected={mode === 'manual'}
            className={`${styles.modeTab} ${mode === 'manual' ? styles.modeActive : ''}`}
            onClick={() => setMode('manual')}
            role="tab"
            type="button"
          >
            <Icon name="bookmark" size={15} /> Manual
          </button>
        </div>

        <div className={styles.modalBody}>
          {mode === 'google' ? (
            <GoogleSearchPanel initialQuery={initialQuery} onSaved={onCreated} />
          ) : (
            <ManualPlaceForm onSaved={onCreated} />
          )}
        </div>
      </div>
    </div>
  )
}
