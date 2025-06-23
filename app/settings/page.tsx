import { EmailSettings } from "@/components/email-settings"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">ตั้งค่าระบบ</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">จัดการรายการอีเมลสำหรับรับการแจ้งเตือน</p>
        </div>

        <EmailSettings />
      </div>
    </div>
  )
}
