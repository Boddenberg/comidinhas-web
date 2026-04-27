import { Icon } from '@/shared/ui/Icon/Icon'
import styles from './GroupPanel.module.css'

const members = [
  {
    id: 'filipe',
    name: 'Filipe',
    objectPosition: '30% 25%',
  },
  {
    id: 'victor',
    name: 'Victor',
    objectPosition: '70% 60%',
  },
]

export function GroupPanel() {
  return (
    <section className={`surfaceCard ${styles.panel}`}>
      <header className={styles.header}>
        <h3 className={styles.title}>Nosso grupo</h3>
        <button aria-label="Adicionar membro" className={styles.addButton} type="button">
          <Icon name="plus" size={16} />
        </button>
      </header>

      <ul className={styles.avatars}>
        {members.map((member) => (
          <li key={member.id} className={styles.avatar}>
            <img
              alt={member.name}
              loading="lazy"
              src="/casal-fv.png"
              style={{ objectPosition: member.objectPosition }}
            />
          </li>
        ))}
        <li className={`${styles.avatar} ${styles.avatarPlus}`}>
          <Icon name="plus" size={18} />
        </li>
      </ul>
    </section>
  )
}
