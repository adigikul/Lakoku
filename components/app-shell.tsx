import type { ReactNode } from 'react'
import { BottomNav } from '@/components/bottom-nav'

export function AppShell({
  children,
  withNav = true,
}: {
  children: ReactNode
  withNav?: boolean
}) {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-background">
      <div className={`flex flex-1 flex-col ${withNav ? 'pb-24' : ''}`}>{children}</div>
      {withNav && <BottomNav />}
    </div>
  )
}
