import { readinessScore } from '../data/mock'

export function ScoreCard() {
  const { current, target, label, statusLabel } = readinessScore
  const progress = Math.min(100, Math.round((current / target) * 100))
  const segments = 10
  const filled = Math.round((current / target) * segments)

  return (
    <div className="flex items-start gap-3">
      <article className="min-w-0 flex-1 rounded-[16px] border border-mystic-mint bg-white p-5 shadow-[var(--shadow-faint)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-oceanic-noir/70">{label}</h2>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-nocturnal-expedition">
              {current}
              <span className="text-base font-medium text-oceanic-noir/45"> / {target}</span>
            </p>
          </div>
          <span className="inline-flex items-center rounded-[10px] bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss">
            {statusLabel}
          </span>
        </div>

        <div
          className="flex gap-1"
          role="meter"
          aria-label={`${label}: ${current} of ${target}`}
          aria-valuemin={0}
          aria-valuemax={target}
          aria-valuenow={current}
        >
          {Array.from({ length: segments }, (_, index) => (
            <span
              key={index}
              className={`h-2 flex-1 rounded-sm ${
                index < filled ? 'bg-nocturnal-expedition' : 'bg-mystic-mint'
              }`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-oceanic-noir/50">{progress}% of target</p>
      </article>

      {/* TODO: swap in the real El meerkat icon SVG */}
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-nocturnal-expedition"
        aria-hidden
        title="El"
      >
        <span className="font-wordmark text-sm font-semibold text-forsythia">El</span>
      </div>
    </div>
  )
}
