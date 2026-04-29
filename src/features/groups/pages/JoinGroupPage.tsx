import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import type { Grupo } from '@/features/auth/types'
import {
  fetchGrupoByCodigo,
  solicitarEntradaGrupo,
  type SolicitacaoEntradaGrupo,
} from '@/features/auth/services/authService'
import { resolveGroupBackgroundUrl } from '@/features/groups/lib/groupBackgrounds'
import { getErrorMessage } from '@/shared/lib/getErrorMessage'
import { Icon } from '@/shared/ui/Icon/Icon'
import styles from './JoinGroupPage.module.css'

const CODIGO_PATTERN = /^\d{6}$/

function memberCount(group: Grupo | null) {
  return group?.membros?.length ? group.membros.length : 1
}

export function JoinGroupPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { perfil, selectGrupo } = useAuth()
  const codigo = searchParams.get('codigo')?.trim() ?? ''
  const hasValidCode = CODIGO_PATTERN.test(codigo)

  const [group, setGroup] = useState<Grupo | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [request, setRequest] = useState<SolicitacaoEntradaGrupo | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const isAlreadyMember = useMemo(() => {
    if (!perfil || !group?.membros?.length) return false
    return group.membros.some(
      (member) => member.perfil_id === perfil.id || member.email === perfil.email,
    )
  }, [group, perfil])

  useEffect(() => {
    if (!hasValidCode) {
      setGroup(null)
      setLoadError(codigo ? 'Codigo de convite invalido.' : 'Abra um convite com codigo para entrar.')
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setRequest(null)
    setSubmitError(null)

    fetchGrupoByCodigo(codigo)
      .then((result) => {
        if (cancelled) return
        setGroup(result)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setGroup(null)
        setLoadError(getErrorMessage(err, 'Nao encontramos esse convite.'))
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [codigo, hasValidCode])

  async function handleRequestJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!perfil || !hasValidCode) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const result = await solicitarEntradaGrupo(codigo, {
        perfil_id: perfil.id,
        mensagem: message.trim() || undefined,
      })
      setRequest(result)

      if (result.status === 'aceita' && group) {
        await selectGrupo(group.id).catch(() => undefined)
      }
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, 'Nao foi possivel solicitar entrada agora.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleOpenGroup() {
    if (!group) return
    setSubmitError(null)

    try {
      await selectGrupo(group.id)
      navigate('/grupos')
    } catch (err: unknown) {
      setSubmitError(getErrorMessage(err, 'Nao foi possivel abrir esse grupo.'))
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.card}>
        <span className={styles.badge}>
          <Icon name="users" size={16} />
          Convite de grupo
        </span>

        {loading ? (
          <div className={styles.centerState}>
            <div className={styles.spinner} aria-hidden="true" />
            <p>Carregando convite...</p>
          </div>
        ) : loadError ? (
          <div className={styles.centerState}>
            <Icon name="x" size={28} />
            <h1>Convite indisponivel</h1>
            <p>{loadError}</p>
            <Link className={styles.secondaryButton} to="/grupos">
              Ver meus grupos
            </Link>
          </div>
        ) : group ? (
          <>
            <div className={styles.header}>
              <img alt="" src={resolveGroupBackgroundUrl(group.foto_url)} />
              <div>
                <p className={styles.eyebrow}>Codigo {codigo}</p>
                <h1>{group.nome}</h1>
                <p>{group.descricao ?? 'Solicite entrada para participar desse espaco.'}</p>
              </div>
            </div>

            <div className={styles.infoGrid}>
              <span>
                <Icon name="users" size={18} />
                <strong>{memberCount(group)}</strong>
                membros
              </span>
              <span>
                <Icon name="mail" size={18} />
                <strong>pedido</strong>
                com aprovacao
              </span>
            </div>

            {isAlreadyMember ? (
              <div className={styles.successBox}>
                <Icon name="circle-check" size={22} />
                <span>Voce ja faz parte desse grupo.</span>
              </div>
            ) : request ? (
              <div className={styles.successBox}>
                <Icon name="circle-check" size={22} />
                <span>
                  {request.status === 'aceita'
                    ? 'Entrada aceita. Grupo definido como ativo.'
                    : 'Solicitacao enviada. Agora e so aguardar a aprovacao.'}
                </span>
              </div>
            ) : (
              <form className={styles.form} onSubmit={handleRequestJoin}>
                <label className={styles.field}>
                  <span>Mensagem opcional</span>
                  <textarea
                    maxLength={500}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Oi, quero entrar no grupo para salvar lugares com voces."
                    value={message}
                  />
                </label>

                {submitError ? <p className={styles.error}>{submitError}</p> : null}

                <button className={styles.primaryButton} disabled={submitting} type="submit">
                  <span>{submitting ? 'Enviando...' : 'Solicitar entrada'}</span>
                  <Icon name="arrow-right" size={18} />
                </button>
              </form>
            )}

            {isAlreadyMember || request?.status === 'aceita' ? (
              <button className={styles.primaryButton} onClick={handleOpenGroup} type="button">
                <span>Abrir grupo</span>
                <Icon name="arrow-right" size={18} />
              </button>
            ) : null}

            {submitError && (isAlreadyMember || request) ? (
              <p className={styles.error}>{submitError}</p>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  )
}
