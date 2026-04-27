import { PLACE_STATUSES, PLACE_STATUS_LABELS, type PlaceStatus } from '../types'
import styles from './StatusSwitcher.module.css'

type StatusSwitcherProps = {
  value: PlaceStatus
  onChange: (next: PlaceStatus) => void
  disabled?: boolean
  size?: 'sm' | 'md'
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
            {PLACE_STATUS_LABELS[status]}
          </button>
        )
      })}
    </div>
  )
}
