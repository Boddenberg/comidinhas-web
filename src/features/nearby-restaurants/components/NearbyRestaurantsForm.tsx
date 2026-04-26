import type { FormEvent } from 'react'
import { Button } from '@/shared/ui/Button/Button'
import type { NearbyRestaurantsFilters } from '../types'
import styles from './NearbyRestaurantsForm.module.css'

interface NearbyRestaurantsFormProps {
  filters: NearbyRestaurantsFilters
  isLoading: boolean
  isLocating: boolean
  onChange: <TField extends keyof NearbyRestaurantsFilters>(
    field: TField,
    value: NearbyRestaurantsFilters[TField],
  ) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onUseCurrentLocation: () => void
}

export function NearbyRestaurantsForm({
  filters,
  isLoading,
  isLocating,
  onChange,
  onSubmit,
  onUseCurrentLocation,
}: NearbyRestaurantsFormProps) {
  return (
    <form className={`surfaceCard ${styles.form}`} onSubmit={onSubmit}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Parametros da busca</h2>
          <p className={styles.description}>
            Ajuste coordenadas, raio e quantidade maxima antes de consultar o backend.
          </p>
        </div>

        <Button disabled={isLoading || isLocating} onClick={onUseCurrentLocation} variant="ghost">
          {isLocating ? 'Localizando...' : 'Usar minha localizacao'}
        </Button>
      </div>

      <div className={styles.grid}>
        <label className="formField">
          <span className="formLabel">Latitude</span>
          <input
            className="textInput"
            disabled={isLoading}
            onChange={(event) => onChange('latitude', event.target.value)}
            value={filters.latitude}
          />
        </label>

        <label className="formField">
          <span className="formLabel">Longitude</span>
          <input
            className="textInput"
            disabled={isLoading}
            onChange={(event) => onChange('longitude', event.target.value)}
            value={filters.longitude}
          />
        </label>

        <label className="formField">
          <span className="formLabel">Raio (metros)</span>
          <input
            className="textInput"
            disabled={isLoading}
            onChange={(event) => onChange('radiusMeters', event.target.value)}
            value={filters.radiusMeters}
          />
        </label>

        <label className="formField">
          <span className="formLabel">Maximo de resultados</span>
          <input
            className="textInput"
            disabled={isLoading}
            onChange={(event) => onChange('maxResults', event.target.value)}
            value={filters.maxResults}
          />
        </label>
      </div>

      <label className="formField">
        <span className="formLabel">Rank preference</span>
        <select
          className="selectInput"
          disabled={isLoading}
          onChange={(event) => onChange('rankPreference', event.target.value as NearbyRestaurantsFilters['rankPreference'])}
          value={filters.rankPreference}
        >
          <option value="POPULARITY">POPULARITY</option>
          <option value="DISTANCE">DISTANCE</option>
        </select>
        <span className="formHint">
          O tipo enviado nesta versao e sempre `restaurant`, deixando a interface mais enxuta.
        </span>
      </label>

      <Button disabled={isLoading} fullWidth type="submit">
        {isLoading ? 'Buscando restaurantes...' : 'Buscar restaurantes proximos'}
      </Button>
    </form>
  )
}
