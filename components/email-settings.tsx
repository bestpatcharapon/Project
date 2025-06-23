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
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false)
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
    // Using a temporary string ID for new emails to avoid key conflicts
    setEmails([...emails, { id: `new-${Date.now()}`, email: "" }])
  }

  const removeEmail = (id: number | string) => {
    setEmails(emails.filter((email) => email.id !== id))
  }

  const handleSave = async () => {
    setIsSaving(true)

    // Filter out empty emails before saving
    const emailsToSave = emails
        .map(e => ({...e, email: e.email.trim()}))
        .filter(e => e.email)
        .map(e => {
            // Convert temp string IDs to null so the backend knows they are new
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
    // Check if there are any saved emails first
    const savedEmails = emails.filter(e => typeof e.id === 'number' && e.email.trim())
    
    if (savedEmails.length === 0) {
      toast({
        title: "ไม่มีอีเมลที่บันทึกแล้ว",
        description: "กรุณาเพิ่มและบันทึกอีเมลก่อนทดสอบ",
        variant: "destructive",
      })
      return
    }

    setIsSendingTestEmail(true)
    
    try {
      const response = await fetch("/api/test-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          testMessage: "การทดสอบระบบแจ้งเตือนจาก ESP32 Setup - ระบบทำงานปกติ ✅"
        }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "ส่งอีเมลทดสอบสำเร็จ! 📧",
          description: `ส่งไปยัง ${result.details.recipientCount} อีเมล`,
        })
      } else {
        throw new Error(result.error || "Failed to send test email")
      }
    } catch (error) {
      toast({
        title: "ส่งอีเมลทดสอบไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการส่งอีเมล",
        variant: "destructive",
      })
    } finally {
      setIsSendingTestEmail(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
            <Mail className="w-6 h-6" />
            <CardTitle>อีเมลสำหรับแจ้งเตือน</CardTitle>
        </div>
        <Badge variant="secondary">{emails.length} อีเมล</Badge>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {emails.map((email, index) => (
              <div key={email.id} className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder={`อีเมลที่ ${index + 1}`}
                  value={email.email}
                  onChange={(e) => handleEmailChange(email.id, e.target.value)}
                />
                <Button variant="ghost" size="icon" onClick={() => removeEmail(email.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" className="w-full border-dashed" onClick={addNewEmail}>
              <Plus className="w-4 h-4 mr-2" />
              เพิ่มอีเมล
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          onClick={handleTestEmail} 
          disabled={isSendingTestEmail}
          variant="outline"
          className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:text-green-800 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:border-green-700 dark:text-green-400"
        >
          {isSendingTestEmail ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ส่งทดสอบ...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              ทดสอบอีเมล
            </>
          )}
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          บันทึก
        </Button>
      </CardFooter>
    </Card>
  )
} 