import {
  HardDrive,
  KeyRound,
  ShieldCheck,
  Timer,
  UserX,
  Zap,
} from 'lucide-react'
import { Marquee } from './motion/index.jsx'

const ITEMS = [
  { icon: ShieldCheck, text: 'Your data never leaves your device' },
  { icon: HardDrive, text: '100% on-device DuckDB engine' },
  { icon: Zap, text: 'Results in seconds — no queues' },
  { icon: UserX, text: 'No accounts · no cookies · no tracking' },
  { icon: KeyRound, text: 'Bring your own AI key' },
  { icon: Timer, text: 'Undo, redo & reset at any time' },
]

/**
 * Scrolling strip of trust badges under the hero. Pure decoration —
 * respects prefers-reduced-motion.
 */
export default function TrustMarquee() {
  return (
    <div className="mt-8 w-full border-y border-border bg-surface py-2">
      <Marquee speed={30} pauseOnHover>
        {ITEMS.map((item) => (
          <span
            key={item.text}
            className="mx-4 inline-flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-text-secondary"
          >
            <item.icon className="h-3.5 w-3.5 text-accent-700" />
            {item.text}
          </span>
        ))}
      </Marquee>
    </div>
  )
}
