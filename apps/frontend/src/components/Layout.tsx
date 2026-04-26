import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLogout, useMe } from '../lib/auth';
import { Button } from './ui';

export function Layout() {
  const me = useMe();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur dark:border-stone-800 dark:bg-stone-950/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <NavLink to="/" className="flex items-center gap-2">
            <span className="text-xl">🪴</span>
            <span className="text-lg font-semibold tracking-tight">Garden Guide</span>
          </NavLink>

          {me.data && (
            <nav className="hidden items-center gap-1 sm:flex">
              <HeaderLink to="/">Home</HeaderLink>
              <HeaderLink to="/zones">Zones</HeaderLink>
              <HeaderLink to="/plants">Plants</HeaderLink>
            </nav>
          )}

          {me.data && (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-stone-500 sm:inline">{me.data.displayName}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  logout.mutate(undefined, {
                    onSuccess: () => navigate('/login', { replace: true }),
                  })
                }
                disabled={logout.isPending}
              >
                Sign out
              </Button>
            </div>
          )}
        </div>
        {me.data && (
          <nav className="flex items-center gap-1 border-t border-stone-200 px-4 py-2 sm:hidden">
            <HeaderLink to="/">Home</HeaderLink>
            <HeaderLink to="/zones">Zones</HeaderLink>
            <HeaderLink to="/plants">Plants</HeaderLink>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <Outlet />
      </main>
    </div>
  );
}

function HeaderLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100'
            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
