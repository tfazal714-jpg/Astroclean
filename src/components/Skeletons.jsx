import { Shimmer } from './motion/index.jsx'
import { cn } from '../utils/cn.js'

/** A single skeleton line of configurable width. */
export function SkeletonLine({ className, width = '100%' }) {
  return <Shimmer className={cn('h-3', className)} style={{ width }} />
}

/** Skeleton for the data grid while the first page loads. */
export function GridSkeleton({ columns = 6, rows = 8 }) {
  return (
    <div className="p-4" aria-label="Loading table">
      {/* header */}
      <div className="mb-3 flex gap-3 border-b border-border pb-3">
        {Array.from({ length: columns }, (_, i) => (
          <Shimmer key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* rows */}
      <div className="space-y-2.5">
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex gap-3">
            {Array.from({ length: columns }, (_, c) => (
              <Shimmer key={c} className="h-3 flex-1" style={{ width: `${50 + ((r * 7 + c * 13) % 45)}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/** Skeleton for the columns stats panel. */
export function ListSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-4 p-3" aria-label="Loading list">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i}>
          <Shimmer className="mb-1.5 h-3 w-2/5" />
          <Shimmer className="h-2 w-full" />
          <div className="mt-1.5 flex gap-2">
            <Shimmer className="h-3 w-16" />
            <Shimmer className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Skeleton for stat cards. */
export function CardSkeleton({ rows = 3 }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="border border-border bg-surface-secondary/60 p-3">
          <Shimmer className="mb-2 h-2.5 w-2/3" />
          <Shimmer className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}

/** Full-screen skeleton used while DuckDB boots. */
export function BootSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <Shimmer className="mb-5 h-12 w-12 rounded-sm" />
      <Shimmer className="mb-2 h-4 w-56" />
      <Shimmer className="h-3 w-40" />
      <p className="sr-only">Loading AstroClean</p>
    </div>
  )
}
