import { useEffect, useState, type FormEvent } from 'react'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Button } from '@/shared/ui/Button/Button'
import { useAuth } from '../AuthContext'
import { createGrupo } from '../services/authService'
import styles from './ProfilePage.module.css'

export function ProfilePage() {
  const { perfil, grupo, grupos, selectGrupo, signOut, updatePerfil } = useAuth()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cidade, setCidade] = useState('')
  const [bio, setBio] = useState('')

  const [grupoNome, setGrupoNome] = useState('')
  const [grupoTipo, setGrupoTipo] = useState<'casal' | 'grupo'>('casal')
  const [grupoDescricao, setGrupoDescricao] = useState('')
  const [memberEmails, setMemberEmails] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [creatingGrupo, setCreatingGrupo] = useState(false)
  const [switchingGrupo, setSwitchingGrupo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [contextSuccess, setContextSuccess] = useState(false)

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
    setContextSuccess(false)
    setSubmitting(true)
    try {
      await updatePerfil({
        bio: bio.trim(),
        cidade: cidade.trim(),
        email: email.trim().toLowerCase(),
        nome: nome.trim(),
      })
      setSuccess(true)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Nao foi possivel salvar seu perfil.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGrupoChange(grupoId: string) {
    setError(null)
    setSuccess(false)
    setContextSuccess(false)
    setSwitchingGrupo(true)
    try {
      await selectGrupo(grupoId)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Nao foi possivel trocar o contexto.'))
    } finally {
      setSwitchingGrupo(false)
    }
  }

  async function handleCreateGrupo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!perfil) return

    const emails = memberEmails
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)

    setError(null)
    setSuccess(false)
    setContextSuccess(false)
    setCreatingGrupo(true)
    try {
      const created = await createGrupo({
        descricao: grupoDescricao.trim() || undefined,
        membros: [{ perfil_id: perfil.id }, ...emails.map((memberEmail) => ({ email: memberEmail }))],
        nome: grupoNome.trim(),
        tipo: grupoTipo,
      })
      await selectGrupo(created.id)
      setGrupoNome('')
      setGrupoDescricao('')
      setMemberEmails('')
      setContextSuccess(true)
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Nao foi possivel criar o contexto.'))
    } finally {
      setCreatingGrupo(false)
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
          Atualize as informacoes para deixar a IA mais certeira no contexto ativo.
        </p>
        {grupo ? (
          <p className={styles.groupChip}>
            Contexto ativo: <strong>{grupo.nome}</strong>
          </p>
        ) : null}
        {grupos.length > 1 ? (
          <label className={styles.contextSelect}>
            <span>Contexto</span>
            <select
              className="selectInput"
              disabled={switchingGrupo}
              onChange={(event) => handleGrupoChange(event.target.value)}
              value={grupo?.id ?? ''}
            >
              {grupos.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </header>

      {error ? <p className={styles.error}>{error}</p> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.gridFields}>
          <label className={styles.field}>
            <span>Nome</span>
            <input
              className="textInput"
              disabled={submitting}
              minLength={2}
              onChange={(event) => setNome(event.target.value)}
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
              onChange={(event) => setEmail(event.target.value)}
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
              onChange={(event) => setCidade(event.target.value)}
              placeholder="Sao Paulo"
              type="text"
              value={cidade}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span>Sobre voce</span>
          <textarea
            className="textArea"
            disabled={submitting}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Gosto de sushi, comida arabe e cafes tranquilos..."
            value={bio}
          />
        </label>

        {success ? <p className={styles.success}>Perfil atualizado com sucesso!</p> : null}

        <div className={styles.actions}>
          <Button onClick={signOut} type="button" variant="ghost">
            Sair da conta
          </Button>
          <Button disabled={submitting} type="submit" variant="primary">
            {submitting ? 'Salvando...' : 'Salvar alteracoes'}
          </Button>
        </div>
      </form>

      <form className={styles.form} onSubmit={handleCreateGrupo}>
        <div>
          <h2 className={styles.formTitle}>Novo contexto</h2>
          <p className={styles.formDescription}>
            Crie um casal ou grupo para separar lugares, guias, home e IA por contexto.
          </p>
        </div>

        <div className={styles.gridFields}>
          <label className={styles.field}>
            <span>Nome do contexto</span>
            <input
              className="textInput"
              disabled={creatingGrupo}
              minLength={2}
              onChange={(event) => setGrupoNome(event.target.value)}
              placeholder="Filipe e Victor"
              required
              type="text"
              value={grupoNome}
            />
          </label>

          <label className={styles.field}>
            <span>Tipo</span>
            <select
              className="selectInput"
              disabled={creatingGrupo}
              onChange={(event) => setGrupoTipo(event.target.value as 'casal' | 'grupo')}
              value={grupoTipo}
            >
              <option value="casal">Casal</option>
              <option value="grupo">Grupo</option>
            </select>
          </label>
        </div>

        <label className={styles.field}>
          <span>E-mails de membros</span>
          <input
            className="textInput"
            disabled={creatingGrupo}
            onChange={(event) => setMemberEmails(event.target.value)}
            placeholder="victor@email.com, amigo@email.com"
            type="text"
            value={memberEmails}
          />
        </label>

        <label className={styles.field}>
          <span>Descricao</span>
          <textarea
            className="textArea"
            disabled={creatingGrupo}
            onChange={(event) => setGrupoDescricao(event.target.value)}
            placeholder="Nosso guia de restaurantes"
            value={grupoDescricao}
          />
        </label>

        {contextSuccess ? <p className={styles.success}>Contexto criado e selecionado.</p> : null}

        <div className={styles.actions}>
          <span className={styles.contextHint}>O criador entra como membro do contexto.</span>
          <Button disabled={creatingGrupo || grupoNome.trim().length < 2} type="submit">
            {creatingGrupo ? 'Criando...' : 'Criar contexto'}
          </Button>
        </div>
      </form>
    </div>
  )
}
