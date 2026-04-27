import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Button } from '@/shared/ui/Button/Button'
import { useAuth } from '../AuthContext'
import styles from './ProfilePage.module.css'

export function ProfilePage() {
  const { perfil, grupo, signOut, updatePerfil } = useAuth()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cidade, setCidade] = useState('')
  const [bio, setBio] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!perfil) return
    setNome(perfil.nome ?? '')
    setEmail(perfil.email ?? '')
    setCidade(perfil.cidade ?? '')
    setBio(perfil.bio ?? '')
  }, [perfil])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    try {
      await updatePerfil({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        cidade: cidade.trim(),
        bio: bio.trim(),
      })
      setSuccess(true)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível salvar seu perfil.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!perfil) {
    return <p className={styles.muted}>Carregando seu perfil...</p>
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Nosso perfil</h1>
        <p className={styles.subtitle}>
          Atualize as informações pra deixar a IA mais certeira e o grupo mais cara de vocês.
        </p>
        {grupo ? (
          <p className={styles.groupChip}>
            Grupo ativo: <strong>{grupo.nome}</strong>
          </p>
        ) : null}
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.gridFields}>
          <label className={styles.field}>
            <span>Nome</span>
            <input
              className="textInput"
              disabled={submitting}
              minLength={2}
              onChange={(e) => setNome(e.target.value)}
              required
              type="text"
              value={nome}
            />
          </label>

          <label className={styles.field}>
            <span>E-mail</span>
            <input
              className="textInput"
              disabled={submitting}
              onChange={(e) => setEmail(e.target.value)}
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
        </div>

        <label className={styles.field}>
          <span>Sobre vocês</span>
          <textarea
            className="textArea"
            disabled={submitting}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Casal apaixonado por sushi e drinks autorais..."
            value={bio}
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}
        {success ? <p className={styles.success}>Perfil atualizado com sucesso!</p> : null}

        <div className={styles.actions}>
          <Button onClick={signOut} type="button" variant="ghost">
            Sair da conta
          </Button>
          <Button disabled={submitting} type="submit" variant="primary">
            {submitting ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </div>
      </form>
    </div>
  )
}
