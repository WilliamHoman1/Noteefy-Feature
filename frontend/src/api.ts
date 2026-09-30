import type {
  Booking,
  Course,
  CourseFilters,
  HealthResponse,
  TeeTime,
  TeeTimeQuery,
  User,
} from './types'

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body
      ? { 'Content-Type': 'application/json', ...init?.headers }
      : init?.headers,
  })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: unknown } | null
    throw new ApiError(detailMessage(body?.detail) ?? `Request failed (${res.status})`)
  }

  return (await res.json()) as T
}

/** FastAPI returns a string for our errors and a list for validation failures. */
function detailMessage(detail: unknown): string | null {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string } | undefined
    return first?.msg ?? null
  }
  return null
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),

  courses: () => request<Course[]>('/api/courses'),

  courseFilters: (courseId: string) =>
    request<CourseFilters>(`/api/courses/${courseId}/filters`),

  teeTimes: ({
    courseId,
    date,
    players,
    holes,
    cartPolicy,
    teeTimeWindow,
  }: TeeTimeQuery) => {
    const params = new URLSearchParams({ course_id: courseId, date })
    if (players) params.set('players', String(players))
    if (holes) params.set('holes', String(holes))
    if (cartPolicy) params.set('cart_policy', cartPolicy)
    if (teeTimeWindow) params.set('tee_time_window', teeTimeWindow)
    return request<TeeTime[]>(`/api/tee-times?${params}`)
  },

  signup: (name: string, email: string, password: string) =>
    request<User>('/api/users/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email: string, password: string) =>
    request<User>('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  user: (userId: string) => request<User>(`/api/users/${userId}`),

  userBookings: (userId: string) =>
    request<Booking[]>(`/api/users/${userId}/bookings`),

  createBooking: (input: {
    userId: string
    teeTimeId: string
    players: number
    holes: number
    cart: boolean
  }) =>
    request<Booking>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        user_id: input.userId,
        tee_time_id: input.teeTimeId,
        players: input.players,
        holes: input.holes,
        cart: input.cart,
      }),
    }),

  cancelBooking: (bookingId: string) =>
    request<Booking>(`/api/bookings/${bookingId}`, { method: 'DELETE' }),
}
