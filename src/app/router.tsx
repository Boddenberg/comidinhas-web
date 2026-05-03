import { createBrowserRouter, Navigate } from 'react-router-dom'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ProfilePage } from '@/features/auth/pages/ProfilePage'
import { SignupPage } from '@/features/auth/pages/SignupPage'
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute'
import { AiGuideImportPage } from '@/features/ai-guides/pages/AiGuideImportPage'
import { ChatPage } from '@/features/chat/pages/ChatPage'
import { GroupsHubPage } from '@/features/groups/pages/GroupsHubPage'
import { JoinGroupPage } from '@/features/groups/pages/JoinGroupPage'
import { GuidesPage } from '@/features/guides/pages/GuidesPage'
import { HomePage } from '@/features/home/pages/HomePage'
import { NearbyRestaurantsPage } from '@/features/nearby-restaurants/pages/NearbyRestaurantsPage'
import { PlacesListPage } from '@/features/places/pages/PlacesListPage'
import { AppShell } from './AppShell'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'chat', element: <ChatPage /> },
          { path: 'favoritos', element: <PlacesListPage /> },
          { path: 'grupos', element: <GroupsHubPage /> },
          { path: 'entrar', element: <JoinGroupPage /> },
          { path: 'guias', element: <GuidesPage /> },
          { path: 'guias/ia', element: <AiGuideImportPage /> },
          { path: 'lugares', element: <PlacesListPage /> },
          { path: 'lugares/novo', element: <Navigate replace to="/" /> },
          { path: 'restaurantes-proximos', element: <NearbyRestaurantsPage /> },
          { path: 'explorar', element: <NearbyRestaurantsPage /> },
          { path: 'perfil', element: <ProfilePage /> },
          { path: 'desafios', element: <Navigate replace to="/" /> },
          { path: 'historico', element: <Navigate replace to="/" /> },
          { path: 'configuracoes', element: <Navigate replace to="/perfil" /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate replace to="/" /> },
])
