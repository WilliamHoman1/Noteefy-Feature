import { cartLabel, formatTeeTime, holesLabel, playersLabel, teeTimePrice } from '../format'
import { CartIcon, FlagIcon, PinIcon, UsersIcon } from './Icons'
import type { TeeTime } from '../types'

type TeeTimeCardProps = {
  tee: TeeTime
  onBook: (tee: TeeTime) => void
}

/** Every line on this card is a value read from the tee time document. */
export function TeeTimeCard({ tee, onBook }: TeeTimeCardProps) {
  const soldOut = tee.slots_available < 1

  return (
    <article className="tee-card">
      <header className="tee-card-head">
        <span className="tee-time">
          {formatTeeTime(tee.start_time, tee.course_timezone)}
        </span>
        <span className="tee-price">{teeTimePrice(tee)}</span>
      </header>

      <div className="tee-card-body">
        <p className="tee-row tee-row-course">
          <PinIcon className="tee-icon" />
          <span>{tee.course_name}</span>
        </p>
        <p className="tee-row">
          <UsersIcon className="tee-icon" />
          <span>{playersLabel(tee.slots_available)}</span>
        </p>
        <p className="tee-row">
          <FlagIcon className="tee-icon" />
          <span>{holesLabel(tee.holes_options)}</span>
        </p>
        <p className="tee-row">
          <CartIcon className="tee-icon" />
          <span>{cartLabel(tee.cart_policy)}</span>
        </p>

        <button
          type="button"
          className="book-button"
          disabled={soldOut}
          onClick={() => onBook(tee)}
        >
          {soldOut ? 'Full' : 'Book'}
        </button>
      </div>
    </article>
  )
}
