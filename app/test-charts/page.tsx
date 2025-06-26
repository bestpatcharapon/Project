"use client"

import { DashboardCharts } from "@/components/charts/DashboardCharts"

export default function TestChartsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="container mx-auto">
        <h1 className="text-2xl font-bold mb-8 text-gray-900 dark:text-gray-100">
          ทดสอบกราฟ
        </h1>
        <DashboardCharts />
      </div>
    </div>
  )
}