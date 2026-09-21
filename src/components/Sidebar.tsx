import { navGroups, currentUser } from '../data/mock'

type SidebarProps = {
  collapsed?: boolean
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-oceanic-noir text-arctic-powder transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
      aria-label="Primary"
    >
      <div className={`flex h-16 items-center ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <a
          href="/"
          className="font-wordmark text-[1.65rem] leading-none tracking-tight text-arctic-powder no-underline"
          aria-label="Elqo home"
        >
          {collapsed ? 'E' : 'Elqo'}
        </a>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4" aria-label="Learner navigation">
        {navGroups.map((group) => (
          <div key={group.id} className={group.label ? 'mt-5' : 'mt-1'}>
            {group.label && !collapsed && (
              <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-arctic-powder/50">
                {group.label}
              </p>
            )}
            <ul className="m-0 list-none space-y-0.5 p-0">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      aria-current={item.active ? 'page' : undefined}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-medium no-underline transition-colors ${
                        collapsed ? 'justify-center' : ''
                      } ${
                        item.active
                          ? 'bg-nocturnal-expedition text-arctic-powder'
                          : 'text-arctic-powder/80 hover:bg-white/5 hover:text-arctic-powder'
                      }`}
                    >
                      <Icon className="size-[18px] shrink-0" strokeWidth={1.5} aria-hidden />
                      {!collapsed && <span>{item.label}</span>}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className={`border-t border-white/10 ${
          collapsed ? 'flex justify-center p-3' : 'flex items-center gap-3 p-4'
        }`}
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-nocturnal-expedition text-xs font-semibold text-arctic-powder"
          aria-hidden
        >
          {currentUser.initials}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-arctic-powder">{currentUser.name}</p>
            <p className="truncate text-xs text-arctic-powder/60">{currentUser.role}</p>
          </div>
        )}
      </div>
    </aside>
  )
}
