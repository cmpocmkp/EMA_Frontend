import { createBrowserRouter, Navigate } from 'react-router'
import AppLayout from './layout/AppLayout'
import LoadingScreen from './layout/LoadingScreen'
import LoginPage from './pages/LoginPage'
import PlaceholderPage from './pages/PlaceholderPage'
import SummaryPage from './pages/summary/SummaryPage'
import UsersPage from './pages/UsersPage'

export const router = createBrowserRouter([
  { path: '/login', Component: LoginPage },
  {
    path: '/',
    Component: AppLayout,
    // Rendered while a lazy page (the map) loads on the first visit.
    HydrateFallback: LoadingScreen,
    children: [
      { index: true, element: <Navigate to="/map" replace /> },
      {
        path: 'map',
        // Mapbox GL is large, so the map page loads on first visit instead of with the login screen.
        lazy: { Component: async () => (await import('./pages/MapPage')).default },
      },
      { path: 'summary', Component: SummaryPage },
      { path: 'division', element: <PlaceholderPage title="Division" /> },
      { path: 'district', element: <PlaceholderPage title="District" /> },
      { path: 'users', Component: UsersPage },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
