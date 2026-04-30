import { useEffect, useState } from 'react'
import { Icon } from '@/shared/ui/Icon/Icon'
import { GoogleSearchPanel } from './GoogleSearchPanel'
import { ManualPlaceForm } from './ManualPlaceForm'
import type { Place } from '../types'
import styles from './AddPlace.module.css'

type AddPlaceModalProps = {
  onClose: () => void
  onCreated: (place: Place) => void
  initialPlaceId?: string
  initialQuery?: string
  initialMode?: 'google' | 'manual'
  titleOverride?: string
  subtitleOverride?: string
}

export function AddPlaceModal({
  initialMode = 'google',
  initialPlaceId,
  initialQuery = '',
  onClose,
  onCreated,
  subtitleOverride,
  titleOverride,
}: AddPlaceModalProps) {
  const [mode, setMode] = useState<'google' | 'manual'>(initialMode)
  const [hasSelectedGooglePlace, setHasSelectedGooglePlace] = useState(Boolean(initialPlaceId))
  const isConfirmingGooglePlace = mode === 'google' && hasSelectedGooglePlace

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

  function handleModeChange(nextMode: 'google' | 'manual') {
    setHasSelectedGooglePlace(false)
    setMode(nextMode)
  }

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
          <div className={styles.modalTitleRow}>
            <span className={styles.modalMapBadge} aria-hidden="true">
              <img alt="" src="/btn-google-maps.png" />
            </span>
            <div>
              <h2 id="add-place-title" className={styles.modalTitle}>
                {titleOverride ??
                  (isConfirmingGooglePlace
                    ? 'É esse lugar?'
                    : mode === 'google'
                      ? 'Encontrar restaurante'
                      : 'Adicionar lugar')}
              </h2>
              <p className={styles.modalSubtitle}>
                {subtitleOverride ??
                  (isConfirmingGooglePlace
                    ? 'Confira os detalhes antes de adicionar ao casal.'
                    : mode === 'google'
                      ? 'Busque no Google Maps e confirme antes de salvar.'
                      : 'Cadastre manualmente quando o Google Maps não encontrar.')}
              </p>
            </div>
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

        {!isConfirmingGooglePlace ? (
          <div className={styles.modeRow} role="tablist">
            <button
              aria-selected={mode === 'google'}
              className={`${styles.modeTab} ${mode === 'google' ? styles.modeActive : ''}`}
              onClick={() => handleModeChange('google')}
              role="tab"
              type="button"
            >
              <Icon name="search" size={15} /> Google Maps
            </button>
            <button
              aria-selected={mode === 'manual'}
              className={`${styles.modeTab} ${mode === 'manual' ? styles.modeActive : ''}`}
              onClick={() => handleModeChange('manual')}
              role="tab"
              type="button"
            >
              <Icon name="bookmark" size={15} /> Manual
            </button>
          </div>
        ) : null}

        <div className={styles.modalBody}>
          {mode === 'google' ? (
            <GoogleSearchPanel
              initialPlaceId={initialPlaceId}
              initialQuery={initialQuery}
              onSaved={onCreated}
              onSelectionChange={setHasSelectedGooglePlace}
            />
          ) : (
            <ManualPlaceForm onSaved={onCreated} />
          )}
        </div>
      </div>
    </div>
  )
}
