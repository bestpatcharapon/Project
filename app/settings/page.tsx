import { EmailSettings } from "../../components/email-settings"
import { Settings } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-6 py-10 max-w-2xl">
        
        {/* Header Section */}
        <div className="mb-12">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-3 mb-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Settings className="w-6 h-6 text-gray-500" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">ตั้งค่าระบบ</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-center sm:text-left">
              จัดการรายการอีเมลสำหรับรับการแจ้งเตือนจากระบบตรวจจับ
            </p>
          </div>
        </div>

        <EmailSettings />
        
      </div>
    </div>
  )
} 