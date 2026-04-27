import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, type Location } from 'react-router-dom'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Button } from '@/shared/ui/Button/Button'
import { useAuth } from '../AuthContext'
import { AuthLayout } from '../components/AuthLayout'
import styles from './AuthForm.module.css'

type LocationState = { from?: Location } | null

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signIn({ email: email.trim(), password })
      const state = location.state as LocationState
      const redirectTo = state?.from?.pathname ?? '/'
      navigate(redirectTo, { replace: true })
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível entrar. Verifique seus dados.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      footer={
        <>
          Ainda não tem conta?
          <Link className={styles.footerLink} to="/signup">
            Criar agora
          </Link>
        </>
      }
      subtitle="Entre para ver seus lugares, seus guias e deixar a IA decidir."
      title="Bem-vindos de volta"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>E-mail</span>
          <input
            autoComplete="email"
            className="textInput"
            disabled={submitting}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="vocesdois@comidinhas.app"
            required
            type="email"
            value={email}
          />
        </label>

        <label className={styles.field}>
          <span>Senha</span>
          <input
            autoComplete="current-password"
            className="textInput"
            disabled={submitting}
            minLength={6}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            type="password"
            value={password}
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}

        <Button disabled={submitting} fullWidth type="submit" variant="primary">
          {submitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </AuthLayout>
  )
}
