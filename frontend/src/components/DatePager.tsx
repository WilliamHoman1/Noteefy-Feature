import { shiftDate } from '../format'
import { CalendarIcon, ChevronIcon } from './Icons'

type DatePagerProps = {
  date: string
  today: string
  onChange: (date: string) => void
}

export function DatePager({ date, today, onChange }: DatePagerProps) {
  const isToday = date === today
  const atEarliest = date <= today

  return (
    <div className="date-pager">
      <button
        type="button"
        className="date-step"
        aria-label="Previous day"
        disabled={atEarliest}
        onClick={() => onChange(shiftDate(date, -1))}
      >
        <ChevronIcon direction="left" />
      </button>

      <button
        type="button"
        className="date-today"
        onClick={() => onChange(today)}
        disabled={isToday}
      >
        <CalendarIcon />
        <span>{isToday ? 'Today' : 'Back to today'}</span>
      </button>

      <button
        type="button"
        className="date-step"
        aria-label="Next day"
        onClick={() => onChange(shiftDate(date, 1))}
      >
        <ChevronIcon direction="right" />
      </button>
    </div>
  )
}
