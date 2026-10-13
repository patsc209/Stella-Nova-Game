import { useEffect, useState } from 'react'
import { analytics, todaysPlan } from './data/mock'
import { Hero } from './components/Hero'
import { PlanRow } from './components/PlanRow'
import { Sidebar } from './components/Sidebar'
import { StatCard } from './components/StatCard'
import { TopBar } from './components/TopBar'

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1023px)').matches : false,
  )

  useEffect(() => {
    const media = window.matchMedia('(max-width: 1023px)')
    const onChange = () => setCollapsed(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return collapsed
}

export default function App() {
  const sidebarCollapsed = useSidebarCollapsed()

  return (
    <div className="min-h-screen bg-arctic-powder font-ui text-oceanic-noir">
      <Sidebar collapsed={sidebarCollapsed} />
      <TopBar sidebarCollapsed={sidebarCollapsed} />

      <main
        className={`mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 ${
          sidebarCollapsed ? 'ml-16' : 'ml-60'
        } transition-[margin] duration-200`}
      >
        <Hero />

        <section className="mt-10" aria-labelledby="analytics-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 id="analytics-heading" className="text-lg font-semibold tracking-tight text-nocturnal-expedition">
              Analytics
            </h2>
            <a
              href="#analytics"
              className="text-sm font-medium text-nocturnal-expedition no-underline hover:underline"
            >
              See all analytics
            </a>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {analytics.map((stat) => (
              <StatCard key={stat.id} stat={stat} />
            ))}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="plan-heading">
          <h2 id="plan-heading" className="mb-4 text-lg font-semibold tracking-tight text-nocturnal-expedition">
            Today&apos;s plan
          </h2>
          <ol className="m-0 list-none rounded-[16px] border border-mystic-mint bg-white px-4 shadow-[var(--shadow-faint)] sm:px-5">
            {todaysPlan.map((item) => (
              <PlanRow key={item.id} item={item} />
            ))}
          </ol>
        </section>
      </main>
    </div>
  )
}
