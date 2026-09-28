import { FormEvent, useEffect, useState } from 'react'
import './App.css'

type HealthResponse = {
  status: string
  mongo: string
}

type Course = {
  id: string
  name: string
  location: string
  holes: number
}

type TeeTime = {
  id: string
  course_id: string
  start_time: string
  slots_available: number
  price_cents: number
}

type Booking = {
  id: string
  tee_time_id: string
  golfer_name: string
  players: number
  created_at: string
  status: string
}

/** Matches backend seed/search, which uses UTC calendar dates. */
function tomorrowUtcDate(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [dateOn, setDateOn] = useState(tomorrowUtcDate)
  const [players, setPlayers] = useState(1)
  const [teeTimes, setTeeTimes] = useState<TeeTime[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [golferName, setGolferName] = useState('')
  const [selectedTeeTimeId, setSelectedTeeTimeId] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)

  async function loadCourses() {
    const res = await fetch('/api/courses')
    if (!res.ok) throw new Error(`Courses failed (${res.status})`)
    const data = (await res.json()) as Course[]
    setCourses(data)
    setSelectedCourseId((current) => current || data[0]?.id || '')
  }

  async function searchTeeTimes(courseId: string, date: string, partySize: number) {
    if (!courseId || !date) {
      setTeeTimes([])
      return
    }
    setSearching(true)
    try {
      const params = new URLSearchParams({
        course_id: courseId,
        date,
        players: String(partySize),
      })
      const res = await fetch(`/api/tee-times?${params}`)
      if (!res.ok) throw new Error(`Tee times failed (${res.status})`)
      const data = (await res.json()) as TeeTime[]
      setTeeTimes(data)
      setSelectedTeeTimeId((current) =>
        data.some((tee) => tee.id === current) ? current : (data[0]?.id ?? ''),
      )
    } finally {
      setSearching(false)
    }
  }

  async function loadBookings() {
    const res = await fetch('/api/bookings')
    if (!res.ok) throw new Error(`Bookings failed (${res.status})`)
    setBookings((await res.json()) as Booking[])
  }

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const healthRes = await fetch('/api/health')
        if (!healthRes.ok) throw new Error('API unreachable')
        const healthData = (await healthRes.json()) as HealthResponse
        if (cancelled) return
        setHealth(healthData)
        await loadCourses()
        await loadBookings()
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load')
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedCourseId) return
    void searchTeeTimes(selectedCourseId, dateOn, players).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to search tee times')
    })
  }, [selectedCourseId, dateOn, players])

  async function onBook(event: FormEvent) {
    event.preventDefault()
    setMessage(null)
    setError(null)

    if (!selectedTeeTimeId || !golferName.trim()) {
      setError('Pick a tee time and enter a golfer name.')
      return
    }

    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tee_time_id: selectedTeeTimeId,
        golfer_name: golferName.trim(),
        players,
      }),
    })

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { detail?: string } | null
      setError(body?.detail ?? `Booking failed (${res.status})`)
      return
    }

    setMessage(`Booked for ${golferName.trim()}.`)
    setGolferName('')
    await searchTeeTimes(selectedCourseId, dateOn, players)
    await loadBookings()
  }

  async function onCancel(bookingId: string) {
    setMessage(null)
    setError(null)

    const res = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE' })
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { detail?: string } | null
      setError(body?.detail ?? `Cancel failed (${res.status})`)
      return
    }

    setMessage('Booking cancelled. Slots returned to the tee time.')
    await searchTeeTimes(selectedCourseId, dateOn, players)
    await loadBookings()
  }

  const healthClass =
    health?.status === 'ok' && health.mongo === 'ok'
      ? 'ok'
      : health
        ? 'warn'
        : 'bad'

  const selectedCourse = courses.find((c) => c.id === selectedCourseId)
  const selectedTee = teeTimes.find((t) => t.id === selectedTeeTimeId)

  return (
    <div className="page">
      <header className="nav">
        <a className="nav-brand" href="/" aria-label="Noteefy home">
          <img className="nav-logo" src="/noteefy-logo.webp" alt="Noteefy" />
        </a>
        <div className="nav-meta">
          <span className={`pill ${healthClass}`}>
            <span className="dot" aria-hidden="true" />
            System {health?.status ?? '…'}
          </span>
        </div>
      </header>

      <section className="hero">
        <div className="hero-inner">
          <p className="hero-kicker">Golfer booking lab</p>
          <h1>Find and book the tee time you want.</h1>
          <p className="hero-copy">
            Search by course, date, and party size — then reserve in seconds.
            Built for a Noteefy-style booking experience.
          </p>
        </div>
      </section>

      <main className="content">
        {error && <p className="banner bad">{error}</p>}
        {message && <p className="banner good">{message}</p>}

        <div className="layout">
          <section className="card">
            <h2>Search tee times</h2>
            <div className="search">
              <label className="field">
                <span>Course</span>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                >
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name} — {course.location}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Date</span>
                <input
                  type="date"
                  value={dateOn}
                  onChange={(e) => setDateOn(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Players</span>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={players}
                  onChange={(e) => setPlayers(Number(e.target.value))}
                />
              </label>
            </div>

            <div className="section-head">
              <h2>Available</h2>
              <span className="count">
                {searching
                  ? 'Searching…'
                  : `${teeTimes.length} time${teeTimes.length === 1 ? '' : 's'}`}
              </span>
            </div>

            {teeTimes.length === 0 ? (
              <p className="empty">No tee times match this search.</p>
            ) : (
              <ul className="list">
                {teeTimes.map((tee) => (
                  <li key={tee.id}>
                    <button
                      type="button"
                      className={
                        tee.id === selectedTeeTimeId ? 'row selected' : 'row'
                      }
                      onClick={() => setSelectedTeeTimeId(tee.id)}
                    >
                      <span className="row-time">{formatWhen(tee.start_time)}</span>
                      <span className="row-meta">
                        {tee.slots_available} open ·{' '}
                        {formatPrice(tee.price_cents)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <aside className="layout-side">
            <form className="card" onSubmit={onBook}>
              <h2>Complete booking</h2>
              <label className="field">
                <span>Golfer name</span>
                <input
                  value={golferName}
                  onChange={(e) => setGolferName(e.target.value)}
                  placeholder="Alex Rivers"
                />
              </label>
              <p className="meta">
                {selectedCourse?.name ?? 'Course'}
                {selectedTee
                  ? ` · ${formatWhen(selectedTee.start_time)} · party of ${players}`
                  : ` · party of ${players}`}
              </p>
              <button type="submit" className="cta">
                Confirm booking
              </button>
            </form>

            <section className="card">
              <div className="section-head">
                <h2>Your bookings</h2>
                <span className="count">{bookings.length}</span>
              </div>
              {bookings.length === 0 ? (
                <p className="empty">No bookings yet.</p>
              ) : (
                <ul className="list bookings">
                  {bookings.map((booking) => (
                    <li key={booking.id} className="booking">
                      <div className="booking-main">
                        <span className="booking-name">
                          {booking.golfer_name} · {booking.players} player
                          {booking.players === 1 ? '' : 's'}
                        </span>
                        <span className={`status ${booking.status}`}>
                          {booking.status}
                        </span>
                      </div>
                      <div className="booking-actions">
                        <span className="when">
                          {formatWhen(booking.created_at)}
                        </span>
                        {booking.status !== 'cancelled' && (
                          <button
                            type="button"
                            className="linkish"
                            onClick={() => void onCancel(booking.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </main>

      <footer className="footer">
        <strong>Noteefy</strong> · Local tee time booking environment
      </footer>
    </div>
  )
}

function formatWhen(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatPrice(cents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export default App
