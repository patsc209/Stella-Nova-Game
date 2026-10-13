import type { PlanItem } from '../data/mock'

type PlanRowProps = {
  item: PlanItem
}

function statusClasses(status: PlanItem['status']) {
  switch (status) {
    case 'on-track':
      return 'bg-moss/10 text-moss'
    case 'gap':
      return 'bg-clay/10 text-clay'
    default:
      return 'bg-mystic-mint text-oceanic-noir/70'
  }
}

export function PlanRow({ item }: PlanRowProps) {
  return (
    <li className="flex flex-col gap-4 border-b border-mystic-mint px-1 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold tracking-tight text-nocturnal-expedition">
          {item.title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-[10px] border border-mystic-mint bg-arctic-powder px-2.5 py-0.5 text-oceanic-noir/70">
            {item.category}
          </span>
          <span className="text-oceanic-noir/55">{item.duration}</span>
          {item.lastScore !== null ? (
            <span className={`rounded-[10px] px-2.5 py-0.5 text-xs font-semibold ${statusClasses(item.status)}`}>
              {item.lastScore} · {item.statusLabel}
            </span>
          ) : (
            <span className={`rounded-[10px] px-2.5 py-0.5 text-xs font-semibold ${statusClasses(item.status)}`}>
              {item.statusLabel}
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        className="inline-flex shrink-0 items-center justify-center rounded-[10px] border border-nocturnal-expedition px-4 py-2 text-sm font-semibold text-nocturnal-expedition transition-colors hover:bg-mystic-mint sm:self-center"
      >
        Start
      </button>
    </li>
  )
}
