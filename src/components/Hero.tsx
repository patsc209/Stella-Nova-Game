import { Play } from 'lucide-react'
import { hero } from '../data/mock'
import { ScoreCard } from './ScoreCard'

export function Hero() {
  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-end" aria-labelledby="hero-heading">
      <div>
        <h1
          id="hero-heading"
          className="text-[2rem] leading-tight font-semibold tracking-tight text-nocturnal-expedition sm:text-[2.25rem]"
        >
          {hero.greeting}
        </h1>
        <p className="mt-2 max-w-xl text-base leading-relaxed text-oceanic-noir/70">
          {hero.subcopy}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-[10px] bg-forsythia px-4 py-2.5 text-sm font-semibold text-oceanic-noir transition-colors hover:bg-deep-saffron"
          >
            <Play className="size-4" strokeWidth={1.5} aria-hidden />
            {hero.primaryCta}
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-[10px] border border-nocturnal-expedition bg-transparent px-4 py-2.5 text-sm font-semibold text-nocturnal-expedition transition-colors hover:bg-mystic-mint"
          >
            {hero.secondaryCta}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-oceanic-noir/65">{hero.certificationDue}</p>
        <ScoreCard />
      </div>
    </section>
  )
}
