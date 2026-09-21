import { Flame, Search } from 'lucide-react'
import { streak } from '../data/mock'

type TopBarProps = {
  sidebarCollapsed?: boolean
}

export function TopBar({ sidebarCollapsed = false }: TopBarProps) {
  return (
    <header
      className={`sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-mystic-mint bg-arctic-powder px-4 sm:px-6 lg:px-8 ${
        sidebarCollapsed ? 'ml-16' : 'ml-60'
      } transition-[margin] duration-200`}
    >
      <label className="relative max-w-md flex-1">
        <span className="sr-only">Search scenarios</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-oceanic-noir/45"
          strokeWidth={1.5}
          aria-hidden
        />
        <input
          type="search"
          placeholder="Search scenarios…"
          className="w-full rounded-[10px] border border-mystic-mint bg-white py-2.5 pr-3 pl-10 text-sm text-oceanic-noir placeholder:text-oceanic-noir/40"
        />
      </label>

      <div
        className="inline-flex items-center gap-2 rounded-[10px] bg-oceanic-noir px-3 py-2 text-sm font-medium text-arctic-powder"
        aria-label={streak.label}
      >
        <Flame className="size-4 text-forsythia" strokeWidth={1.5} aria-hidden />
        <span className="whitespace-nowrap">{streak.label}</span>
      </div>
    </header>
  )
}
