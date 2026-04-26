import { type ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useLogout, useMe } from '../lib/auth';
import { Button } from './ui';

export function Layout() {
  const me = useMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const authed = !!me.data;

  const onSignOut = () => {
    logout.mutate(undefined, {
      onSuccess: () => navigate('/login', { replace: true }),
    });
  };

  return (
    <div className="min-h-screen bg-sage">
      <div className="md:flex md:min-h-screen md:gap-6 md:p-6">
        {authed && (
          <aside className="hidden md:flex md:w-60 md:shrink-0 md:flex-col md:rounded-3xl bg-cream p-5 shadow-card">
            <Brand />
            <nav className="mt-8 flex flex-col gap-1">
              <SidebarLink to="/" icon={<HomeIcon />}>
                Home
              </SidebarLink>
              <SidebarLink to="/zones" icon={<ZonesIcon />}>
                Zones
              </SidebarLink>
              <SidebarLink to="/plants" icon={<PlantsIcon />}>
                Plants
              </SidebarLink>
              <SidebarLink to="/calendar" icon={<CalendarIcon />}>
                Calendar
              </SidebarLink>
              <SidebarLink to="/settings" icon={<SettingsIcon />}>
                Settings
              </SidebarLink>
            </nav>
            <div className="mt-auto flex flex-col gap-3 border-t border-hairline pt-4">
              <p className="px-2 text-sm font-medium text-ink">{me.data?.displayName}</p>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={onSignOut}
                disabled={logout.isPending}
              >
                Sign out
              </Button>
            </div>
          </aside>
        )}

        <main className="min-h-screen flex-1 bg-cream px-5 pb-32 pt-6 md:min-h-0 md:rounded-3xl md:px-10 md:pb-10 md:pt-8 md:shadow-card">
          {authed ? (
            <header className="mb-6 flex items-center justify-between md:hidden">
              <Brand />
              <Button
                variant="ghost"
                size="sm"
                onClick={onSignOut}
                disabled={logout.isPending}
              >
                Sign out
              </Button>
            </header>
          ) : (
            <header className="mb-8 flex items-center justify-center md:justify-start">
              <Brand />
            </header>
          )}
          <Outlet />
        </main>
      </div>

      {authed && (
        <nav className="fixed inset-x-5 bottom-5 z-50 flex h-16 items-center justify-around rounded-full bg-ink px-2 shadow-float md:hidden">
          <BottomLink to="/" icon={<HomeIcon />} label="Home" />
          <BottomLink to="/zones" icon={<ZonesIcon />} label="Zones" />
          <BottomLink to="/plants" icon={<PlantsIcon />} label="Plants" />
          <BottomLink to="/calendar" icon={<CalendarIcon />} label="Calendar" />
          <BottomLink to="/settings" icon={<SettingsIcon />} label="Settings" />
        </nav>
      )}
    </div>
  );
}

function Brand() {
  return (
    <NavLink to="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-cream">
        <SproutIcon />
      </span>
      <span className="text-lg font-semibold tracking-tight text-ink">Garden Guide</span>
    </NavLink>
  );
}

function SidebarLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-200 ease-leaf ${
          isActive
            ? 'bg-ink text-cream'
            : 'text-ink hover:bg-ivory'
        }`
      }
    >
      <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
      <span>{children}</span>
    </NavLink>
  );
}

function BottomLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex h-12 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-200 ease-leaf ${
          isActive ? 'bg-cream text-ink' : 'text-cream/80 hover:text-cream'
        }`
      }
      aria-label={label}
    >
      {({ isActive }) => (
        <>
          <span className="flex h-5 w-5 items-center justify-center">{icon}</span>
          {isActive && <span>{label}</span>}
        </>
      )}
    </NavLink>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4 11l8-7 8 7v8a2 2 0 0 1-2 2h-3v-6h-6v6H6a2 2 0 0 1-2-2v-8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ZonesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PlantsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 21v-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 14c-3 0-6-2-6-6 3 0 6 2 6 6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 14c0-3 2-6 6-6 0 4-3 6-6 6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <rect
        x="3.5"
        y="5.5"
        width="17"
        height="15"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3.5 10h17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 3.5v3M16 3.5v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8.5" cy="14" r="0.9" fill="currentColor" />
      <circle cx="13" cy="14" r="0.9" fill="currentColor" />
      <circle cx="8.5" cy="17.5" r="0.9" fill="currentColor" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.36 5.64l-1.77 1.77M7.41 16.59l-1.77 1.77M18.36 18.36l-1.77-1.77M7.41 7.41 5.64 5.64"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SproutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 21v-8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12 13c-2 0-4-1.5-4-4 2 0 4 1.5 4 4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 13c0-2.5 1.5-4.5 4.5-4.5 0 3-2 4.5-4.5 4.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
