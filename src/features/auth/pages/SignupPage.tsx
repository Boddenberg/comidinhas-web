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

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cidade, setCidade] = useState('')
  const [bio, setBio] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await signUp({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        cidade: cidade.trim() || undefined,
        bio: bio.trim() || undefined,
      })
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível criar a conta agora.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      footer={
        <>
          Já têm conta?
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
          <span>Nome da pessoa</span>
          <input
            autoComplete="name"
            autoFocus
            className="textInput"
            disabled={submitting}
            minLength={2}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Filipe"
            required
            type="text"
            value={nome}
          />
        </label>

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
          <span>Cidade</span>
          <input
            className="textInput"
            disabled={submitting}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="São Paulo"
            type="text"
            value={cidade}
          />
        </label>

        <label className={styles.field}>
          <span>Sobre vocês (opcional)</span>
          <textarea
            className="textArea"
            disabled={submitting}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Apaixonados por sushi e drinks autorais..."
            value={bio}
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
