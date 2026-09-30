import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { ApiError, api } from './api'
import { useAuth } from './auth'
import { formatHeadingDate, todayInZone } from './format'
import { AuthModal } from './components/AuthModal'
import { BookingModal } from './components/BookingModal'
import { CourseCard } from './components/CourseCard'
import { DatePager } from './components/DatePager'
import { FilterAccordion } from './components/FilterAccordion'
import { ListIcon } from './components/Icons'
import { MyBookings } from './components/MyBookings'
import { NavBar } from './components/NavBar'
import { TeeTimeCard } from './components/TeeTimeCard'
import type {
  Booking,
  CartPolicy,
  Course,
  FilterGroup,
  FilterSelection,
  TeeTime,
} from './types'

type View = 'tee-times' | 'bookings'

function App() {
  const { user, ready, logout } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [courseId, setCourseId] = useState('')
  const [filterGroups, setFilterGroups] = useState<FilterGroup[]>([])
  const [selection, setSelection] = useState<FilterSelection>({})
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const [teeTimes, setTeeTimes] = useState<TeeTime[]>([])
  const [searching, setSearching] = useState(false)

  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)

  const [view, setView] = useState<View>('tee-times')
  const [authPrompt, setAuthPrompt] = useState<string | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [pendingTee, setPendingTee] = useState<TeeTime | null>(null)
  const [bookingTee, setBookingTee] = useState<TeeTime | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const course = useMemo(
    () => courses.find((c) => c.id === courseId) ?? null,
    [courses, courseId],
  )
  // The course's timezone decides what "today" means, so it follows the course document.
  const today = useMemo(() => todayInZone(course?.timezone), [course?.timezone])
  const date = pickedDate ?? today

  useEffect(() => {
    let cancelled = false

    api
      .courses()
      .then((found) => {
        if (cancelled) return
        setCourses(found)
        setCourseId((current) => current || found[0]?.id || '')
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(messageFrom(err, 'Could not load courses'))
      })

    return () => {
      cancelled = true
    }
  }, [])

  // The sidebar options are whatever the database reports for this course.
  useEffect(() => {
    if (!courseId) return
    let cancelled = false

    api
      .courseFilters(courseId)
      .then((found) => {
        if (!cancelled) setFilterGroups(found.groups)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(messageFrom(err, 'Could not load filters'))
      })

    return () => {
      cancelled = true
    }
  }, [courseId])

  const loadTeeTimes = useCallback(async () => {
    if (!courseId || !date) return
    setSearching(true)
    try {
      const found = await api.teeTimes({
        courseId,
        date,
        players: numberOrUndefined(selection.group_size),
        holes: numberOrUndefined(selection.holes),
        cartPolicy: selection.cart_policy as CartPolicy | undefined,
        teeTimeWindow: selection.tee_time,
      })
      setTeeTimes(found)
      setError(null)
    } catch (err) {
      setError(messageFrom(err, 'Could not load tee times'))
    } finally {
      setSearching(false)
    }
  }, [courseId, date, selection])

  useEffect(() => {
    void loadTeeTimes()
  }, [loadTeeTimes])

  const loadBookings = useCallback(async () => {
    if (!user) {
      setBookings([])
      return
    }
    setLoadingBookings(true)
    try {
      setBookings(await api.userBookings(user.id))
    } catch (err) {
      setError(messageFrom(err, 'Could not load your bookings'))
    } finally {
      setLoadingBookings(false)
    }
  }, [user])

  useEffect(() => {
    void loadBookings()
  }, [loadBookings])

  function onFilterChange(groupKey: string, value: string | undefined) {
    // Selecting a course in the sidebar switches which course the grid shows.
    if (groupKey === 'course') {
      const next = courses.find((c) => c.name === value)
      if (next) setCourseId(next.id)
    }
    setSelection((current) => ({ ...current, [groupKey]: value }))
  }

  function onBookClick(tee: TeeTime) {
    setMessage(null)
    if (!user) {
      setPendingTee(tee)
      setAuthPrompt('Create an account to hold this tee time.')
      setAuthOpen(true)
      return
    }
    setBookingTee(tee)
  }

  async function onConfirmBooking(input: {
    players: number
    holes: number
    cart: boolean
  }) {
    if (!user || !bookingTee) return

    const booking = await api.createBooking({
      userId: user.id,
      teeTimeId: bookingTee.id,
      ...input,
    })

    setBookingTee(null)
    setMessage(`Booked ${booking.course_name} · booking ID ${booking.id}`)
    await Promise.all([loadTeeTimes(), loadBookings()])
  }

  async function onCancelBooking(bookingId: string) {
    setMessage(null)
    try {
      await api.cancelBooking(bookingId)
      setMessage('Booking cancelled. The slots are back in the tee sheet.')
      await Promise.all([loadTeeTimes(), loadBookings()])
    } catch (err) {
      setError(messageFrom(err, 'Could not cancel that booking'))
    }
  }

  return (
    <div className="page">
      <NavBar
        user={user}
        activeView={view}
        onNavigate={setView}
        onSignIn={() => {
          setAuthPrompt(null)
          setAuthOpen(true)
        }}
        onSignOut={() => {
          logout()
          setView('tee-times')
        }}
      />

      <main className="shell">
        <aside className="sidebar">
          {course && <CourseCard course={course} />}
          <DatePager date={date} today={today} onChange={setPickedDate} />
          <FilterAccordion
            groups={filterGroups}
            selection={selection}
            onChange={onFilterChange}
          />
        </aside>

        <section className="main">
          <div className="main-head">
            <h1>{formatHeadingDate(date, course?.timezone)}</h1>
            {view === 'tee-times' && (
              <div className="main-head-actions">
                <span className="waitlist-copy">Don't see your desired tee time?</span>
                <button type="button" className="waitlist-button" disabled>
                  <ListIcon />
                  <span>Join the Waitlist</span>
                </button>
              </div>
            )}
          </div>

          {error && <p className="banner bad">{error}</p>}
          {message && <p className="banner good">{message}</p>}

          {view === 'bookings' ? (
            !ready ? (
              <p className="empty">Checking your account…</p>
            ) : !user ? (
              <p className="empty">
                Sign in to see your bookings.
              </p>
            ) : (
              <MyBookings
                bookings={bookings}
                loading={loadingBookings}
                onCancel={onCancelBooking}
              />
            )
          ) : searching ? (
            <p className="empty">Searching tee times…</p>
          ) : teeTimes.length === 0 ? (
            <p className="empty">No tee times match these filters.</p>
          ) : (
            <div className="tee-grid">
              {teeTimes.map((tee) => (
                <TeeTimeCard key={tee.id} tee={tee} onBook={onBookClick} />
              ))}
            </div>
          )}
        </section>
      </main>

      {authOpen && (
        <AuthModal
          reason={authPrompt ?? undefined}
          onClose={() => {
            setAuthOpen(false)
            setAuthPrompt(null)
            setPendingTee(null)
          }}
          onSuccess={() => {
            if (pendingTee) {
              setBookingTee(pendingTee)
              setPendingTee(null)
            }
          }}
        />
      )}

      {bookingTee && user && (
        <BookingModal
          tee={bookingTee}
          golferName={user.name}
          onClose={() => setBookingTee(null)}
          onConfirm={onConfirmBooking}
        />
      )}
    </div>
  )
}

function numberOrUndefined(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function messageFrom(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message
  return err instanceof Error ? err.message : fallback
}

export default App
