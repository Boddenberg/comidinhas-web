import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Button } from '@/shared/ui/Button/Button'
import { useAuth } from '../AuthContext'
import { AuthLayout } from '../components/AuthLayout'
import styles from './AuthForm.module.css'

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signUp({
        email: email.trim(),
        password,
        username: username.trim(),
        full_name: fullName.trim() || undefined,
      })
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível criar sua conta agora.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      footer={
        <>
          Já tem conta?
          <Link className={styles.footerLink} to="/login">
            Entrar
          </Link>
        </>
      }
      subtitle="Bora começar a salvar os lugares que vocês querem viver juntos."
      title="Criar nossa conta"
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.field}>
          <span>Nome completo</span>
          <input
            autoComplete="name"
            className="textInput"
            disabled={submitting}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Filipe Silva"
            type="text"
            value={fullName}
          />
        </label>

        <label className={styles.field}>
          <span>Username</span>
          <input
            autoComplete="username"
            className="textInput"
            disabled={submitting}
            minLength={3}
            onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
            placeholder="filipe"
            required
            type="text"
            value={username}
          />
        </label>

        <label className={styles.field}>
          <span>E-mail</span>
          <input
            autoComplete="email"
            className="textInput"
            disabled={submitting}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="filipe@comidinhas.app"
            required
            type="email"
            value={email}
          />
        </label>

        <label className={styles.field}>
          <span>Senha</span>
          <input
            autoComplete="new-password"
            className="textInput"
            disabled={submitting}
            minLength={6}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="mínimo 6 caracteres"
            required
            type="password"
            value={password}
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}

        <Button disabled={submitting} fullWidth type="submit" variant="primary">
          {submitting ? 'Criando conta...' : 'Criar conta'}
        </Button>
      </form>
    </AuthLayout>
  )
}
