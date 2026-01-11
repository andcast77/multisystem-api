import { Sidebar } from '@/components/layout/Sidebar'
import { SyncStatus } from '@/components/features/pwa/SyncStatus'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      {/* Main content area with sidebar offset */}
      <div className="lg:pl-64">
        <main className="py-6 px-4 sm:px-6 lg:px-8">{children}</main>
        <SyncStatus />
      </div>
    </div>
  )
}
