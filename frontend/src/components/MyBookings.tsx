import { formatBookingWhen, playersLabel } from '../format'
import type { Booking } from '../types'

type MyBookingsProps = {
  bookings: Booking[]
  loading: boolean
  onCancel: (bookingId: string) => void
}

export function MyBookings({ bookings, loading, onCancel }: MyBookingsProps) {
  if (loading) {
    return <p className="empty">Loading your bookings…</p>
  }

  if (bookings.length === 0) {
    return <p className="empty">No bookings yet. Pick a tee time to get started.</p>
  }

  return (
    <ul className="booking-list">
      {bookings.map((booking) => (
        <li className="booking" key={booking.id}>
          <div className="booking-head">
            <span className="booking-when">
              {formatBookingWhen(booking.start_time, booking.course_timezone)}
            </span>
            <span className={`status ${booking.status}`}>{booking.status}</span>
          </div>

          <p className="booking-course">{booking.course_name}</p>
          <p className="booking-detail">
            {booking.golfer_name} · {playersLabel(booking.players)} ·{' '}
            {booking.holes} holes · {booking.cart ? 'with cart' : 'walking'}
          </p>
          <p className="booking-id">Booking ID {booking.id}</p>

          {booking.status !== 'cancelled' && (
            <button
              type="button"
              className="booking-cancel"
              onClick={() => onCancel(booking.id)}
            >
              Cancel booking
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
