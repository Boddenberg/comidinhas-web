import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import styles from './ProtectedRoute.module.css'

export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'idle') {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} aria-hidden="true" />
        <p>Carregando seu perfil...</p>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}
