import { Sidebar } from "@/components/sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { StatCards } from "@/components/stat-cards"
import { WeeklyHoursChart } from "@/components/weekly-hours-chart"
import { ActivityBreakdown } from "@/components/activity-breakdown"
import { KanbanBoard } from "@/components/kanban-board"
import { ActivityFeed } from "@/components/activity-feed"

export default function Page() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />

      <main className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
            <StatCards />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <WeeklyHoursChart />
              </div>
              <ActivityBreakdown />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
              <KanbanBoard />
              <ActivityFeed />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
