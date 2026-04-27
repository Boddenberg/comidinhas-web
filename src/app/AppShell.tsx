import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/shared/ui/Sidebar/Sidebar'
import { Topbar } from '@/shared/ui/Topbar/Topbar'
import styles from './AppShell.module.css'

export function AppShell() {
  return (
    <div className={styles.app}>
      <Sidebar />

      <div className={styles.main}>
        <Topbar />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
