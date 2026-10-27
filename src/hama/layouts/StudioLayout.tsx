import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  viewer: ReactNode
  sidebar: ReactNode
  className?: string
}

export default function StudioLayout({ viewer, sidebar, className }: Props) {
  return (
    <main
      className={cn(
        'flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start',
        className
      )}
    >
      <div className="lg:col-span-7 flex flex-col">{viewer}</div>
      <div className="lg:col-span-5 space-y-6">{sidebar}</div>
    </main>
  )
}
