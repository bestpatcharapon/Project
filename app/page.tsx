"use client"

import { EmailSettings } from "@/components/email-settings"

export default function EmailManagement() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">ระบบจัดการอีเมล</h1>
          <p className="text-muted-foreground">จัดการรายการอีเมลสำหรับรับการแจ้งเตือน</p>
        </div>

        <EmailSettings />
      </div>
    </div>
  )
}
