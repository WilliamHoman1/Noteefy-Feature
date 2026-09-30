import { useState, type FormEvent } from 'react'
import { cartLabel, formatTeeTime, playersLabel, teeTimePrice } from '../format'
import { Modal } from './Modal'
import type { TeeTime } from '../types'

type BookingModalProps = {
  tee: TeeTime
  golferName: string
  onClose: () => void
  onConfirm: (input: { players: number; holes: number; cart: boolean }) => Promise<void>
}

/**
 * The options offered here are the ones the tee time document permits: the
 * holes buttons come from holes_options, the cart toggle appears only when the
 * policy is "optional", and party size is capped by slots_available.
 */
export function BookingModal({
  tee,
  golferName,
  onClose,
  onConfirm,
}: BookingModalProps) {
  const [holes, setHoles] = useState(() => tee.holes_options.at(-1) ?? 18)
  const [players, setPlayers] = useState(1)
  const [cart, setCart] = useState(tee.cart_policy === 'included')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const partySizes = Array.from({ length: tee.slots_available }, (_, i) => i + 1)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await onConfirm({ players, holes, cart })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Confirm your tee time" onClose={onClose}>
      <p className="modal-summary">
        <strong>{tee.course_name}</strong>
        <span>
          {formatTeeTime(tee.start_time, tee.course_timezone)} · {teeTimePrice(tee)} ·{' '}
          {playersLabel(tee.slots_available)} available
        </span>
      </p>

      <form className="modal-form" onSubmit={onSubmit}>
        <fieldset className="choice">
          <legend>Number of holes</legend>
          <div className="choice-options">
            {tee.holes_options.map((option) => (
              <button
                type="button"
                key={option}
                className={option === holes ? 'chip active' : 'chip'}
                onClick={() => setHoles(option)}
              >
                {option} Holes
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="choice">
          <legend>Players</legend>
          <div className="choice-options">
            {partySizes.map((size) => (
              <button
                type="button"
                key={size}
                className={size === players ? 'chip active' : 'chip'}
                onClick={() => setPlayers(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="choice">
          <legend>Cart</legend>
          {tee.cart_policy === 'optional' ? (
            <div className="choice-options">
              <button
                type="button"
                className={cart ? 'chip active' : 'chip'}
                onClick={() => setCart(true)}
              >
                With cart
              </button>
              <button
                type="button"
                className={!cart ? 'chip active' : 'chip'}
                onClick={() => setCart(false)}
              >
                Walking
              </button>
            </div>
          ) : (
            <p className="choice-fixed">{cartLabel(tee.cart_policy)}</p>
          )}
        </fieldset>

        {error && <p className="modal-error">{error}</p>}

        <p className="modal-note">Booking as {golferName}</p>
        <button type="submit" className="modal-submit" disabled={saving}>
          {saving ? 'Booking…' : 'Confirm booking'}
        </button>
      </form>
    </Modal>
  )
}
