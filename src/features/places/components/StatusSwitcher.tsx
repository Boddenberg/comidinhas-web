import { Icon } from '@/shared/ui/Icon/Icon'
import { PLACE_STATUSES, PLACE_STATUS_LABELS, type PlaceStatus } from '../types'
import styles from './StatusSwitcher.module.css'

type StatusSwitcherProps = {
  value: PlaceStatus
  onChange: (next: PlaceStatus) => void
  disabled?: boolean
  size?: 'sm' | 'md'
}

const STATUS_ICONS: Record<PlaceStatus, Parameters<typeof Icon>[0]['name']> = {
  quero_ir: 'pin',
  fomos: 'check',
  quero_voltar: 'heart-filled',
  nao_curti: 'x',
}

export function StatusSwitcher({
  disabled,
  onChange,
  size = 'md',
  value,
}: StatusSwitcherProps) {
  return (
    <div className={`${styles.row} ${size === 'sm' ? styles.sm : ''}`} role="radiogroup">
      {PLACE_STATUSES.map((status) => {
        const isActive = status === value
        return (
          <button
            key={status}
            aria-checked={isActive}
            className={`${styles.chip} ${isActive ? styles[`active_${status}`] : ''}`}
            disabled={disabled}
            onClick={() => onChange(status)}
            role="radio"
            type="button"
          >
            <Icon name={STATUS_ICONS[status]} size={15} />
            {PLACE_STATUS_LABELS[status]}
          </button>
        )
      })}
    </div>
  )
}
