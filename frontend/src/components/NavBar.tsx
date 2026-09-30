import { initials } from '../format'
import type { User } from '../types'

type NavBarProps = {
  user: User | null
  activeView: 'tee-times' | 'bookings'
  onNavigate: (view: 'tee-times' | 'bookings') => void
  onSignIn: () => void
  onSignOut: () => void
}

export function NavBar({
  user,
  activeView,
  onNavigate,
  onSignIn,
  onSignOut,
}: NavBarProps) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <button
          type="button"
          className="nav-brand"
          onClick={() => onNavigate('tee-times')}
        >
          <img className="nav-logo" src="/noteefy-logo.webp" alt="Noteefy" />
        </button>

        <nav className="nav-links">
          <button
            type="button"
            className={activeView === 'bookings' ? 'nav-link active' : 'nav-link'}
            onClick={() => onNavigate('bookings')}
          >
            My Bookings
          </button>
          <button type="button" className="nav-link" disabled>
            Waitlist Searches
          </button>
          <button type="button" className="nav-link" disabled>
            My Groups
          </button>

          {user ? (
            <div className="nav-user">
              <span className="avatar" title={user.email}>
                {initials(user.name)}
              </span>
              <button type="button" className="nav-signout" onClick={onSignOut}>
                Sign out
              </button>
            </div>
          ) : (
            <button type="button" className="nav-signin" onClick={onSignIn}>
              Sign up
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
