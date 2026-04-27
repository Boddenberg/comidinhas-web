import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ChatPage } from '@/features/chat/pages/ChatPage'
import { HomePage } from '@/features/home/pages/HomePage'
import { NearbyRestaurantsPage } from '@/features/nearby-restaurants/pages/NearbyRestaurantsPage'
import { AppShell } from './AppShell'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'chat', element: <ChatPage /> },
      { path: 'restaurantes-proximos', element: <NearbyRestaurantsPage /> },
      { path: 'explorar', element: <NearbyRestaurantsPage /> },
      { path: 'favoritos', element: <Navigate replace to="/" /> },
      { path: 'guias', element: <Navigate replace to="/" /> },
      { path: 'desafios', element: <Navigate replace to="/" /> },
      { path: 'historico', element: <Navigate replace to="/" /> },
      { path: 'perfil', element: <Navigate replace to="/" /> },
      { path: 'configuracoes', element: <Navigate replace to="/" /> },
    ],
  },
])
