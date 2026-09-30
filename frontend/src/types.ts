export type HealthResponse = {
  status: string
  mongo: string
}

export type User = {
  id: string
  name: string
  email: string
  created_at: string
}

export type Course = {
  id: string
  name: string
  city_state: string
  address: string
  phone: string
  holes: number
  timezone: string
  image_url: string | null
}

export type CartPolicy = 'optional' | 'included' | 'walking_only'

export type TeeTime = {
  id: string
  course_id: string
  course_name: string | null
  course_timezone: string | null
  start_time: string
  slots_available: number
  price_min_cents: number
  price_max_cents: number
  cart_policy: CartPolicy
  holes_options: number[]
}

export type FilterOption = {
  value: string
  label: string
  count: number
}

export type FilterGroup = {
  key: string
  label: string
  options: FilterOption[]
}

export type CourseFilters = {
  course_id: string
  groups: FilterGroup[]
}

export type Booking = {
  id: string
  user_id: string
  tee_time_id: string
  golfer_name: string
  players: number
  holes: number
  cart: boolean
  status: string
  created_at: string
  course_name: string | null
  course_timezone: string | null
  start_time: string | null
}

/** The filter values the sidebar can send to the tee time search. */
export type TeeTimeQuery = {
  courseId: string
  date: string
  players?: number
  holes?: number
  cartPolicy?: CartPolicy
  teeTimeWindow?: string
}

/** One selected option value per filter group, keyed by the group's API key. */
export type FilterSelection = Record<string, string | undefined>
