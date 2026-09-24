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
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [teeTimes, setTeeTimes] = useState<TeeTime[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [golferName, setGolferName] = useState('')
  const [players, setPlayers] = useState(1)
  const [selectedTeeTimeId, setSelectedTeeTimeId] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadCourses() {
    const res = await fetch('/api/courses')
    if (!res.ok) throw new Error(`Courses failed (${res.status})`)
    const data = (await res.json()) as Course[]
    setCourses(data)
    if (!selectedCourseId && data.length > 0) {
      setSelectedCourseId(data[0].id)
    }
  }

  async function loadTeeTimes(courseId: string) {
    if (!courseId) {
      setTeeTimes([])
      return
    }
    const res = await fetch(`/api/tee-times?course_id=${courseId}`)
    if (!res.ok) throw new Error(`Tee times failed (${res.status})`)
    const data = (await res.json()) as TeeTime[]
    setTeeTimes(data)
    setSelectedTeeTimeId(data[0]?.id ?? '')
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
    void loadTeeTimes(selectedCourseId).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Failed to load tee times')
    })
  }, [selectedCourseId])

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
    setPlayers(1)
    await loadTeeTimes(selectedCourseId)
    await loadBookings()
  }

  return (
    <main className="shell">
      <header className="top">
        <p className="brand">Noteefy</p>
        <p className="health">
          API {health?.status ?? '…'} · Mongo {health?.mongo ?? '…'}
        </p>
      </header>

      <h1>Tee times</h1>
      <p className="lede">
        Domain skeleton: courses, available tee times, and bookings.
      </p>

      {error && <p className="banner bad">{error}</p>}
      {message && <p className="banner good">{message}</p>}

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

      <section className="panel">
        <h2>Available</h2>
        {teeTimes.length === 0 ? (
          <p className="empty">No tee times for this course.</p>
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
                  <span>{formatWhen(tee.start_time)}</span>
                  <span>
                    {tee.slots_available} open · {formatPrice(tee.price_cents)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form className="book" onSubmit={onBook}>
        <h2>Book</h2>
        <label className="field">
          <span>Golfer name</span>
          <input
            value={golferName}
            onChange={(e) => setGolferName(e.target.value)}
            placeholder="Alex Rivers"
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
        <button type="submit" className="cta">
          Confirm booking
        </button>
      </form>

      <section className="panel">
        <h2>Recent bookings</h2>
        {bookings.length === 0 ? (
          <p className="empty">No bookings yet.</p>
        ) : (
          <ul className="list plain">
            {bookings.map((booking) => (
              <li key={booking.id} className="plain-row">
                <span>
                  {booking.golfer_name} · {booking.players} player
                  {booking.players === 1 ? '' : 's'}
                </span>
                <span>{formatWhen(booking.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function formatWhen(iso: string): string {
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
