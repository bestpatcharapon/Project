"use client"

import { useState } from "react"
import { Plus, Trash2, Wifi, Mail, Key, Smartphone, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"

interface FormData {
  ssid: string
  password: string
  emails: string[]
  appToken: string
}

export default function ESP32Setup() {
  const [formData, setFormData] = useState<FormData>({
    ssid: "",
    password: "",
    emails: [""],
    appToken: "",
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle")
  const { toast } = useToast()

  const addEmailField = () => {
    setFormData((prev) => ({
      ...prev,
      emails: [...prev.emails, ""],
    }))
  }

  const removeEmailField = (index: number) => {
    if (formData.emails.length > 1) {
      setFormData((prev) => ({
        ...prev,
        emails: prev.emails.filter((_, i) => i !== index),
      }))
    }
  }

  const updateEmail = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      emails: prev.emails.map((email, i) => (i === index ? value : email)),
    }))
  }

  const handleConnect = async () => {
    // Validate form
    if (!formData.ssid || !formData.password || !formData.appToken) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกข้อมูล Wi-Fi SSID, Password และ App Token",
        variant: "destructive",
      })
      return
    }

    const validEmails = formData.emails.filter((email) => email.trim() !== "")
    if (validEmails.length === 0) {
      toast({
        title: "ไม่มีอีเมล",
        description: "กรุณากรอกอีเมลอย่างน้อย 1 อีเมล",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)
    setConnectionStatus("idle")

    try {
      const response = await fetch("/api/esp32/configure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          emails: validEmails,
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setConnectionStatus("success")
        toast({
          title: "เชื่อมต่อสำเร็จ!",
          description: "ESP32 ได้รับการตั้งค่าเรียบร้อยแล้ว",
        })
      } else {
        throw new Error(result.error || "Connection failed")
      }
    } catch (error) {
      setConnectionStatus("error")
      toast({
        title: "เชื่อมต่อไม่สำเร็จ",
        description: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการเชื่อมต่อ",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleReset = () => {
    setFormData({
      ssid: "",
      password: "",
      emails: [""],
      appToken: "",
    })
    setConnectionStatus("idle")
    toast({
      title: "รีเซ็ตแล้ว",
      description: "ข้อมูลทั้งหมดถูกล้างเรียบร้อยแล้ว",
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ESP32 Setup</h1>
          <p className="text-gray-600">ตั้งค่าการเชื่อมต่อ Wi-Fi และการแจ้งเตือนทางอีเมล</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Smartphone className="w-6 h-6 text-blue-600" />
              การตั้งค่าอุปกรณ์
            </CardTitle>
            <CardDescription>กรอกข้อมูลเพื่อเชื่อมต่อ ESP32 กับ Wi-Fi และตั้งค่าการแจ้งเตือน</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Wi-Fi Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <Wifi className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold">การตั้งค่า Wi-Fi</h3>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="ssid" className="text-sm font-medium">
                    Wi-Fi SSID
                  </Label>
                  <Input
                    id="ssid"
                    type="text"
                    placeholder="ชื่อเครือข่าย Wi-Fi"
                    value={formData.ssid}
                    onChange={(e) => setFormData((prev) => ({ ...prev, ssid: e.target.value }))}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="รหัสผ่าน Wi-Fi"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Email Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold">อีเมลสำหรับแจ้งเตือน</h3>
                </div>
                <Badge variant="secondary">{formData.emails.filter((e) => e.trim()).length} อีเมล</Badge>
              </div>

              <div className="space-y-3">
                {formData.emails.map((email, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="email"
                      placeholder={`อีเมลที่ ${index + 1}`}
                      value={email}
                      onChange={(e) => updateEmail(index, e.target.value)}
                      className="flex-1"
                    />
                    {formData.emails.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeEmailField(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addEmailField}
                  className="w-full border-dashed border-2 hover:bg-green-50 hover:border-green-300"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  เพิ่มอีเมล
                </Button>
              </div>
            </div>

            <Separator />

            {/* App Token */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold">App Token</h3>
              </div>

              <div>
                <Label htmlFor="appToken" className="text-sm font-medium">
                  App Token
                </Label>
                <Input
                  id="appToken"
                  type="text"
                  placeholder="กรอก App Token สำหรับการยืนยันตัวตน"
                  value={formData.appToken}
                  onChange={(e) => setFormData((prev) => ({ ...prev, appToken: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Connection Status */}
            {connectionStatus !== "idle" && (
              <div
                className={`p-4 rounded-lg ${
                  connectionStatus === "success"
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    connectionStatus === "success" ? "text-green-800" : "text-red-800"
                  }`}
                >
                  {connectionStatus === "success"
                    ? "✅ เชื่อมต่อสำเร็จ! ESP32 พร้อมใช้งาน"
                    : "❌ เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {isConnecting ? "กำลังเชื่อมต่อ..." : "เชื่อมต่อ"}
              </Button>

              <Button onClick={handleReset} variant="outline" size="lg" className="hover:bg-gray-50">
                <RotateCcw className="w-4 h-4 mr-2" />
                รีเซ็ต
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 bg-blue-50/50 border-blue-200">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-blue-900 mb-2">💡 คำแนะนำ</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• ตรวจสอบให้แน่ใจว่า ESP32 อยู่ในโหมดการตั้งค่า</li>
              <li>• อีเมลจะใช้สำหรับรับการแจ้งเตือนจากอุปกรณ์</li>
              <li>• App Token ใช้สำหรับการยืนยันความปลอดภัย</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
