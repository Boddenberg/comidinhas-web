import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Button } from '@/shared/ui/Button/Button'
import { useAuth } from '../AuthContext'
import styles from './ProfilePage.module.css'

export function ProfilePage() {
  const { profile, signOut, updateProfile } = useAuth()

  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [favoriteCuisine, setFavoriteCuisine] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!profile) return
    setFullName(profile.full_name ?? '')
    setUsername(profile.username ?? '')
    setCity(profile.city ?? '')
    setBio(profile.bio ?? '')
    setFavoriteCuisine(profile.favorite_cuisine ?? '')
  }, [profile])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(false)
    setSubmitting(true)
    try {
      await updateProfile({
        full_name: fullName.trim(),
        username: username.trim(),
        city: city.trim(),
        bio: bio.trim(),
        favorite_cuisine: favoriteCuisine.trim(),
      })
      setSuccess(true)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível salvar seu perfil.'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!profile) {
    return <p className={styles.muted}>Carregando seu perfil...</p>
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Nosso perfil</h1>
        <p className={styles.subtitle}>
          Edite suas informações pra deixar a IA mais certeira nas sugestões.
        </p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.gridFields}>
          <label className={styles.field}>
            <span>Nome completo</span>
            <input
              className="textInput"
              disabled={submitting}
              onChange={(e) => setFullName(e.target.value)}
              type="text"
              value={fullName}
            />
          </label>

          <label className={styles.field}>
            <span>Username</span>
            <input
              className="textInput"
              disabled={submitting}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
              type="text"
              value={username}
            />
          </label>

          <label className={styles.field}>
            <span>Cidade</span>
            <input
              className="textInput"
              disabled={submitting}
              onChange={(e) => setCity(e.target.value)}
              placeholder="São Paulo"
              type="text"
              value={city}
            />
          </label>

          <label className={styles.field}>
            <span>Tipo de comida favorita</span>
            <input
              className="textInput"
              disabled={submitting}
              onChange={(e) => setFavoriteCuisine(e.target.value)}
              placeholder="japonesa, italiana, etc."
              type="text"
              value={favoriteCuisine}
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
