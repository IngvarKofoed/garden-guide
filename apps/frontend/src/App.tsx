import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { RequireAuth } from './features/auth/RequireAuth';
import { PlantsPage } from './features/plants/PlantsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { ZonesPage } from './features/zones/ZonesPage';
import { CalendarPage } from './routes/Calendar';
import { Home } from './routes/Home';
import { PlantPage } from './routes/PlantPage';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: (
          <RequireAuth>
            <Home />
          </RequireAuth>
        ),
      },
      {
        path: '/zones',
        element: (
          <RequireAuth>
            <ZonesPage />
          </RequireAuth>
        ),
      },
      {
        path: '/plants',
        element: (
          <RequireAuth>
            <PlantsPage />
          </RequireAuth>
        ),
      },
      {
        path: '/calendar',
        element: (
          <RequireAuth>
            <CalendarPage />
          </RequireAuth>
        ),
      },
      {
        path: '/plants/:id',
        element: (
          <RequireAuth>
            <PlantPage />
          </RequireAuth>
        ),
      },
      {
        path: '/settings',
        element: (
          <RequireAuth>
            <SettingsPage />
          </RequireAuth>
        ),
      },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
