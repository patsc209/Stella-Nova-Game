import type { Stat } from '../data/mock'

type StatCardProps = {
  stat: Stat
}

export function StatCard({ stat }: StatCardProps) {
  const Icon = stat.icon

  return (
    <article className="rounded-[16px] border border-mystic-mint bg-white p-5 shadow-[var(--shadow-faint)]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-oceanic-noir/65">{stat.label}</span>
        <span className="flex size-8 items-center justify-center rounded-[10px] bg-mystic-mint text-nocturnal-expedition">
          <Icon className="size-4" strokeWidth={1.5} aria-hidden />
        </span>
      </div>
      <p className="text-[1.75rem] leading-none font-semibold tracking-tight text-nocturnal-expedition">
        {stat.value}
      </p>
      <p className="mt-2 text-sm font-medium text-nocturnal-expedition">
        {stat.delta}
        <span className="font-normal text-oceanic-noir/50"> vs previous 30 days</span>
      </p>
    </article>
  )
}
