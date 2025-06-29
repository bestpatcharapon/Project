"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Mail, Plus, Trash2, Loader2, Send } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Email {
  id: number
  email: string
}

export function EmailSettings() {
  const [emails, setEmails] = useState<{ id: number | string; email: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

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
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลอีเมลได้",
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailChange = (id: number | string, newEmail: string) => {
    setEmails(emails.map((email) => (email.id === id ? { ...email, email: newEmail } : email)))
  }

  const addNewEmail = () => {
    setEmails([...emails, { id: `new-${Date.now()}`, email: "" }])
  }

  const removeEmail = (id: number | string) => {
    setEmails(emails.filter((email) => email.id !== id))
  }

  const handleSave = async () => {
    setIsSaving(true)

    const emailsToSave = emails
        .map(e => ({...e, email: e.email.trim()}))
        .filter(e => e.email)
        .map(e => {
            if(typeof e.id === 'string' && e.id.startsWith('new-')) {
                return { email: e.email }
            }
            return { id: e.id, email: e.email }
        })

    try {
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailsToSave),
      })

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save emails")
      }

      const result = await response.json()
      setEmails(result.data)
      toast({
        title: "สำเร็จ",
        description: "บันทึกข้อมูลอีเมลเรียบร้อยแล้ว",
      })
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast({
          title: "เกิดข้อผิดพลาด",
          description: errorMessage,
          variant: "destructive",
        })
        console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (emails.filter(e => e.email.trim()).length === 0) {
      toast({
        title: "ไม่สามารถทดสอบได้",
        description: "กรุณาเพิ่มอีเมลก่อนทดสอบ",
        variant: "destructive",
      })
      return
    }

    setIsTesting(true)

    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // ไม่ส่ง testMessage เพื่อให้ API ใช้ข้อมูลจากฐานข้อมูล
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to send test email")
      }

      const result = await response.json()
      toast({
        title: "ส่งอีเมลทดสอบสำเร็จ! 📧",
        description: `ส่งไปยัง ${result.details?.recipientCount || 0} อีเมล`,
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการส่งอีเมล"
      toast({
        title: "เกิดข้อผิดพลาด",
        description: errorMessage,
        variant: "destructive",
      })
      console.error(error)
    } finally {
      setIsTesting(false)
    }
  }



  return (
    <Card className="w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
      <CardHeader className="border-b border-gray-100 dark:border-gray-700 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <CardTitle className="text-gray-900 dark:text-gray-100 text-lg">อีเมลสำหรับแจ้งเตือน</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                จัดการรายการอีเมลที่จะได้รับการแจ้งเตือน • คลิก "ทดสอบอีเมล" เพื่อส่งข้อมูลจากฐานข้อมูล
              </p>
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className="bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 px-4 py-2"
          >
            {emails.length} อีเมล
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">กำลังโหลดข้อมูลอีเมล...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {emails.map((email, index) => (
              <div key={email.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder={`อีเมลที่ ${index + 1}`}
                    value={email.email}
                    onChange={(e) => handleEmailChange(email.id, e.target.value)}
                    className="bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:border-gray-400 dark:focus:border-gray-500 h-12"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeEmail(email.id)}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0 h-12 w-12"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            ))}
            
            <Button 
              variant="outline" 
              className="w-full border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 mt-6 h-12" 
              onClick={addNewEmail}
            >
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มอีเมลใหม่
            </Button>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="border-t border-gray-100 dark:border-gray-700 pt-8 flex justify-between">
        <Button 
          onClick={handleTestEmail} 
          disabled={isTesting || emails.filter(e => e.email.trim()).length === 0}
          variant="outline"
          className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950 px-6 py-3"
        >
          {isTesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              กำลังส่ง...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              ทดสอบอีเมล
            </>
          )}
        </Button>
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 px-6 py-3"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              บันทึก...
            </>
          ) : (
            "บันทึก"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
} 