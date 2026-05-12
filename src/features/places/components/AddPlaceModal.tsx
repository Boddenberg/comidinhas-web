import { useEffect, useState } from 'react'
import { Icon } from '@/shared/ui/Icon/Icon'
import { KnowledgeBaseSearchPanel } from './KnowledgeBaseSearchPanel'
import { ManualPlaceForm } from './ManualPlaceForm'
import type { Place } from '../types'
import styles from './AddPlace.module.css'

type AddPlaceMode = 'base' | 'manual'

type AddPlaceModalProps = {
  onClose: () => void
  onCreated: (place: Place) => void
  initialPlaceId?: string
  initialBaseRestaurantId?: string
  initialQuery?: string
  initialMode?: AddPlaceMode | 'google'
  titleOverride?: string
  subtitleOverride?: string
  isAiPick?: boolean
  aiMotivo?: string | null
  onTryAgain?: () => void
}

export function AddPlaceModal({
  initialMode = 'base',
  initialBaseRestaurantId,
  initialPlaceId,
  initialQuery = '',
  isAiPick = false,
  aiMotivo,
  onClose,
  onCreated,
  onTryAgain,
  subtitleOverride,
  titleOverride,
}: AddPlaceModalProps) {
  const normalizedInitialMode = initialMode === 'google' ? 'base' : initialMode
  const [mode, setMode] = useState<AddPlaceMode>(normalizedInitialMode)
  const [hasSelectedBasePlace, setHasSelectedBasePlace] = useState(
    Boolean(initialBaseRestaurantId ?? initialPlaceId),
  )
  const isConfirmingBasePlace = mode === 'base' && hasSelectedBasePlace
  const aiRevealActive = isAiPick && mode === 'base'

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

  function handleModeChange(nextMode: AddPlaceMode) {
    setHasSelectedBasePlace(false)
    setMode(nextMode)
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        aria-labelledby="add-place-title"
        aria-modal="true"
        className={`${styles.modal} ${aiRevealActive ? styles.modalAi : ''}`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        {!aiRevealActive ? (
          <header className={styles.modalHeader}>
            <div className={styles.modalTitleRow}>
              <span className={styles.modalMapBadge} aria-hidden="true">
                <Icon name="book-open" size={28} />
              </span>
              <div>
                <h2 id="add-place-title" className={styles.modalTitle}>
                  {titleOverride ??
                    (isConfirmingBasePlace
                      ? 'É esse lugar?'
                      : mode === 'base'
                        ? 'Encontrar restaurante'
                        : 'Adicionar lugar')}
                </h2>
                <p className={styles.modalSubtitle}>
                  {subtitleOverride ??
                    (isConfirmingBasePlace
                      ? 'Confira os detalhes antes de adicionar ao casal.'
                      : mode === 'base'
                        ? 'Busque na base própria do Comidinhas e confirme antes de salvar.'
                        : 'Cadastre manualmente quando a base não tiver esse lugar.')}
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
        ) : null}

        {!isConfirmingBasePlace && !aiRevealActive ? (
          <div className={styles.modeRow} role="tablist">
            <button
              aria-selected={mode === 'base'}
              className={`${styles.modeTab} ${mode === 'base' ? styles.modeActive : ''}`}
              onClick={() => handleModeChange('base')}
              role="tab"
              type="button"
            >
              <Icon name="book-open" size={15} /> Base
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

        <div className={`${styles.modalBody} ${aiRevealActive ? styles.modalBodyAi : ''}`}>
          {mode === 'base' ? (
            <KnowledgeBaseSearchPanel
              initialBaseRestaurantId={initialBaseRestaurantId ?? initialPlaceId}
              initialQuery={initialQuery}
              isAiPick={isAiPick}
              aiMotivo={aiMotivo ?? subtitleOverride ?? null}
              onClose={onClose}
              onSaved={onCreated}
              onSelectionChange={setHasSelectedBasePlace}
              onTryAgain={onTryAgain}
            />
          ) : (
            <ManualPlaceForm onSaved={onCreated} />
          )}
        </div>
      </div>
    </div>
  )
}
