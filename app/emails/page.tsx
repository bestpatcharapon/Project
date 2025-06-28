
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Loader2, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface Email {
  id: number
  email: string
}

export default function EmailsPage() {
  const [emails, setEmails] = useState<Email[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchEmails()
  }, [])

  const fetchEmails = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/emails")
      if (!response.ok) {
        throw new Error("Failed to fetch emails")
      }
      const data: Email[] = await response.json()
      setEmails(data)
      console.log("Fetched emails:", data)
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลอีเมลได้",
        variant: "destructive",
      })
      console.error("Error fetching emails:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                รายการอีเมลทั้งหมด
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                อีเมลที่บันทึกในระบบสำหรับรับการแจ้งเตือน
              </p>
            </div>
            
            <Badge 
              variant="secondary" 
              className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-3 py-1 text-sm"
            >
              <Users className="w-4 h-4 mr-2" />
              {emails.length} อีเมล
            </Badge>
          </div>
        </div>

        {/* Email List Card */}
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
          <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-4">
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 text-lg">
              <Mail className="w-5 h-5 text-gray-500" />
              รายการอีเมล
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">กำลังโหลดข้อมูลอีเมล...</p>
                </div>
              </div>
            ) : emails.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  ยังไม่มีอีเมลในระบบ
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                  เพิ่มอีเมลเพื่อรับการแจ้งเตือนจากระบบตรวจจับ
                </p>
                <Link href="/settings">
                  <Button className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900">
                    <Mail className="w-4 h-4 mr-2" />
                    เพิ่มอีเมลแรก
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {emails.map((email, index) => (
                  <div
                    key={email.id}
                    className="flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {email.email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {email.id}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700 text-xs"
                    >
                      ใช้งาน
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>


      </div>
    </div>
  )
} 