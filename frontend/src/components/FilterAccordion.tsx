import { useState } from 'react'
import { CartIcon, ChevronIcon, ClockIcon, FlagIcon, ListIcon, UsersIcon } from './Icons'
import type { FilterGroup, FilterSelection } from '../types'

type FilterAccordionProps = {
  groups: FilterGroup[]
  selection: FilterSelection
  onChange: (groupKey: string, value: string | undefined) => void
}

const GROUP_ICONS: Record<string, typeof UsersIcon> = {
  group_size: UsersIcon,
  holes: FlagIcon,
  course: ListIcon,
  cart_policy: CartIcon,
  tee_time: ClockIcon,
}

export function FilterAccordion({
  groups,
  selection,
  onChange,
}: FilterAccordionProps) {
  const [openKey, setOpenKey] = useState<string | null>(null)

  return (
    <div className="filters">
      {groups.map((group) => {
        const Icon = GROUP_ICONS[group.key] ?? ListIcon
        const isOpen = openKey === group.key
        const selected = selection[group.key]
        const selectedLabel = group.options.find((o) => o.value === selected)?.label

        return (
          <div className={isOpen ? 'filter open' : 'filter'} key={group.key}>
            <button
              type="button"
              className="filter-head"
              aria-expanded={isOpen}
              onClick={() => setOpenKey(isOpen ? null : group.key)}
            >
              <Icon className="filter-icon" />
              <span className="filter-label">
                {group.label}
                {selectedLabel && <em className="filter-value">{selectedLabel}</em>}
              </span>
              <ChevronIcon direction={isOpen ? 'up' : 'down'} />
            </button>

            {isOpen && (
              <div className="filter-body">
                {group.options.map((option) => {
                  const active = selected === option.value
                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={active ? 'filter-option active' : 'filter-option'}
                      onClick={() =>
                        onChange(group.key, active ? undefined : option.value)
                      }
                    >
                      <span>{option.label}</span>
                      <span className="filter-count">{option.count}</span>
                    </button>
                  )
                })}
                {selected && (
                  <button
                    type="button"
                    className="filter-clear"
                    onClick={() => onChange(group.key, undefined)}
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
