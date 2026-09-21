import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Headphones,
  Home,
  LineChart,
  Mic,
} from 'lucide-react'

export type NavItem = {
  id: string
  label: string
  icon: LucideIcon
  active?: boolean
}

export type NavGroup = {
  id: string
  label?: string
  items: NavItem[]
}

/** Single editable array for sidebar navigation (placeholders). */
export const navGroups: NavGroup[] = [
  {
    id: 'primary',
    items: [{ id: 'home', label: 'Home', icon: Home, active: true }],
  },
  {
    id: 'practice',
    label: 'Practice',
    items: [
      { id: 'scenarios', label: 'Scenarios', icon: Mic },
      { id: 'voice', label: 'Voice practice', icon: Headphones },
      { id: 'saved', label: 'Saved & feedback', icon: Bookmark },
    ],
  },
  {
    id: 'learn',
    label: 'Learn',
    items: [{ id: 'lessons', label: 'Lessons', icon: BookOpen }],
  },
  {
    id: 'progress',
    label: 'Progress',
    items: [{ id: 'my-progress', label: 'My progress', icon: LineChart }],
  },
]

export const currentUser = {
  name: 'Sam Rivera',
  role: 'Learner',
  initials: 'SR',
}

export const streak = {
  days: 5,
  label: '5-day streak',
}

export const hero = {
  greeting: 'Ready when you are, Sam.',
  subcopy: 'Two scenarios are queued for today.',
  primaryCta: "Start today's practice",
  secondaryCta: 'See weekly plan',
  certificationDue: 'Customer-call certification due in 11 days',
}

export const readinessScore = {
  label: 'Readiness score',
  current: 72,
  target: 85,
  status: 'on-track' as const,
  statusLabel: 'On track',
}

export type Stat = {
  id: string
  label: string
  value: string
  delta: string
  icon: LucideIcon
}

export const analytics: Stat[] = [
  {
    id: 'scenarios',
    label: 'Scenarios completed',
    value: '14',
    delta: '+4',
    icon: CheckCircle2,
  },
  {
    id: 'rubric',
    label: 'Average rubric score',
    value: '78%',
    delta: '+6',
    icon: LineChart,
  },
  {
    id: 'time',
    label: 'Practice time',
    value: '2h 40m',
    delta: '+35m',
    icon: Clock3,
  },
  {
    id: 'days',
    label: 'Active days',
    value: '9 of 30',
    delta: '+2',
    icon: CalendarDays,
  },
]

export type PlanStatus = 'on-track' | 'gap' | 'not-attempted'

export type PlanItem = {
  id: string
  title: string
  category: string
  duration: string
  lastScore: number | null
  status: PlanStatus
  statusLabel: string
}

export const todaysPlan: PlanItem[] = [
  {
    id: 'price-objection',
    title: 'Handling a price objection',
    category: 'Sales',
    duration: '6 min',
    lastScore: 82,
    status: 'on-track',
    statusLabel: 'On track',
  },
  {
    id: 'de-escalate',
    title: 'De-escalating an upset customer',
    category: 'Customer success',
    duration: '8 min',
    lastScore: 54,
    status: 'gap',
    statusLabel: 'Gap',
  },
  {
    id: 'compliance',
    title: 'Compliance disclosure walkthrough',
    category: 'Compliance',
    duration: '5 min',
    lastScore: null,
    status: 'not-attempted',
    statusLabel: 'Not attempted',
  },
]
