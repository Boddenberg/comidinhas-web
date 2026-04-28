import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { AddPlaceModal } from './components/AddPlaceModal'
import type { Place } from './types'

type OpenOptions = {
  initialQuery?: string
  initialMode?: 'google' | 'manual'
}

type AddPlaceContextValue = {
  open: (options?: OpenOptions) => void
  registerOnCreated: (cb: ((place: Place) => void) | null) => void
}

const AddPlaceContext = createContext<AddPlaceContextValue | null>(null)

type ProviderProps = {
  children: ReactNode
}

export function AddPlaceProvider({ children }: ProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<OpenOptions>({})
  const onCreatedRef = useRef<((place: Place) => void) | null>(null)

  const open = useCallback((nextOptions?: OpenOptions) => {
    setOptions(nextOptions ?? {})
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setOptions({})
  }, [])

  const handleCreated = useCallback(
    (place: Place) => {
      onCreatedRef.current?.(place)
      close()
    },
    [close],
  )

  const registerOnCreated = useCallback((cb: ((place: Place) => void) | null) => {
    onCreatedRef.current = cb
  }, [])

  const value = useMemo<AddPlaceContextValue>(
    () => ({ open, registerOnCreated }),
    [open, registerOnCreated],
  )

  return (
    <AddPlaceContext.Provider value={value}>
      {children}
      {isOpen ? (
        <AddPlaceModal
          initialMode={options.initialMode ?? 'google'}
          initialQuery={options.initialQuery ?? ''}
          onClose={close}
          onCreated={handleCreated}
        />
      ) : null}
    </AddPlaceContext.Provider>
  )
}

export function useAddPlace() {
  const ctx = useContext(AddPlaceContext)
  if (!ctx) {
    throw new Error('useAddPlace must be used inside AddPlaceProvider')
  }
  return ctx
}
