"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Loader2, MapPin, Clock, Zap, Eye, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react"

interface ProcessingPerformance {
  id: number
  dsp_time: number
  classification_time: number
  anomaly_time: number
}

interface Detection {
  id: number
  device_id: string
  location: string
  detection_time: Date
  processing_performance: ProcessingPerformance[]
}

export default function DetectionsPage() {
  const [detections, setDetections] = useState<Detection[]>([])
  const [todayDetectionCount, setTodayDetectionCount] = useState<number>(0)
  const [totalDetectionCount, setTotalDetectionCount] = useState<number>(0)
  const [isLoadingDetections, setIsLoadingDetections] = useState(true)
  const [currentPage, setCurrentPage] = useState<number>(0)
  const [totalPages, setTotalPages] = useState<number>(0)
  const [isShowingTodayData, setIsShowingTodayData] = useState<boolean>(false)
  const [dataMessage, setDataMessage] = useState<string>('')
  
  const ITEMS_PER_PAGE = 6

  useEffect(() => {
    fetchDetections()

    // รีเฟรชข้อมูลการตรวจจับทุก 30 วินาที
    const fetchInterval = setInterval(() => {
      fetchDetections(currentPage)
    }, 30000)

    return () => clearInterval(fetchInterval)
  }, [])

  // Auto-pagination effect - เปลี่ยนหน้าเฉพาะถ้ามีข้อมูลวันนี้มากกว่า 1 หน้า
  useEffect(() => {
    if (totalPages <= 1 || !isShowingTodayData) return

    const pageInterval = setInterval(() => {
      setCurrentPage((prevPage) => {
        const nextPage = prevPage >= totalPages - 1 ? 0 : prevPage + 1
        fetchDetections(nextPage)
        return nextPage
      })
    }, 60000) // เปลี่ยนหน้าทุก 1 นาที (สำหรับข้อมูลวันนี้)

    return () => clearInterval(pageInterval)
  }, [totalPages, isShowingTodayData])

  const fetchDetections = async (page: number = currentPage) => {
    setIsLoadingDetections(true)
    try {
      console.log("Fetching detections for page:", page)
      const response = await fetch(`/api/detections/latest?page=${page}&limit=${ITEMS_PER_PAGE}`)
      console.log("Detection response status:", response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log("Detection data:", data)
        setDetections(data.latestDetections)
        setTodayDetectionCount(data.todayCount)
        setTotalDetectionCount(data.totalCount)
        setTotalPages(data.totalPages)
        setCurrentPage(data.currentPage)
        setIsShowingTodayData(data.isShowingTodayData)
        setDataMessage(data.message || '')
      } else {
        console.error("Failed to fetch detections:", response.status)
      }
    } catch (error) {
      console.error("Error fetching detections:", error)
    } finally {
      setIsLoadingDetections(false)
    }
  }

  const formatDate = (dateString: Date) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getPerformanceColor = (time: number) => {
    if (time < 100) return "text-green-600 dark:text-green-400"
    if (time < 300) return "text-yellow-600 dark:text-yellow-400"
    return "text-red-600 dark:text-red-400"
  }

  // ฟังก์ชันสำหรับเปลี่ยนหน้าด้วยตนเอง
  const goToPage = (pageIndex: number) => {
    setCurrentPage(pageIndex)
    fetchDetections(pageIndex)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-8 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">การตรวจจับล่าสุด</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">แสดงข้อมูลการตรวจจับของวันนี้ ({todayDetectionCount} รายการ)</p>
          </div>
        </div>

        {/* Detection History Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">ข้อมูลการตรวจจับ</h2>
              <p className="text-gray-600 dark:text-gray-400">{dataMessage}</p>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className={`${isShowingTodayData ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'}`}>
                <Eye className="w-3 h-3 mr-1" />
                {isShowingTodayData ? `วันนี้: ${todayDetectionCount}` : `รวม: ${totalDetectionCount}`} รายการ
              </Badge>
              {totalPages > 1 && (
                <div className="flex items-center space-x-1">
                  <Button
                    onClick={() => goToPage(currentPage > 0 ? currentPage - 1 : totalPages - 1)}
                    size="sm"
                    variant="outline"
                    className="p-1 h-8 w-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex space-x-1">
                    {Array.from({ length: totalPages }, (_, index) => (
                      <Button
                        key={index}
                        onClick={() => goToPage(index)}
                        size="sm"
                        variant={index === currentPage ? "default" : "outline"}
                        className={`h-8 w-8 p-0 text-xs ${
                          index === currentPage 
                            ? 'bg-blue-500 hover:bg-blue-600 text-white' 
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {index + 1}
                      </Button>
                    ))}
                  </div>
                <Button
                    onClick={() => goToPage(currentPage < totalPages - 1 ? currentPage + 1 : 0)}
                    size="sm"
                  variant="outline"
                    className="p-1 h-8 w-8"
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              )}
            </div>
              </div>

          {isLoadingDetections ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, index) => (
                <Card key={index} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : detections.length === 0 ? (
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
              <CardContent className="p-12">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-2">
                    ยังไม่มีข้อมูลการตรวจจับวันนี้
                  </h3>
                  <p className="text-sm">
                    ระบบจะแสดงเฉพาะข้อมูลการตรวจจับของวันปัจจุบันเท่านั้น<br/>
                    รอการตรวจจับจาก ESP32 หรือกดรีเฟรชเพื่ออัปเดตข้อมูล
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {detections.map((detection, index) => {
                const globalIndex = (currentPage * ITEMS_PER_PAGE) + index + 1 // หมายเลขลำดับจริง
                return (
                <Card key={detection.id} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] group">
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <Badge variant="secondary" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                          #{globalIndex}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(detection.detection_time)}
                      </div>
                    </div>

                    {/* Device Info */}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                        <Zap className="w-4 h-4 mr-2 text-blue-500 dark:text-blue-400" />
                        <span className="font-medium">{detection.device_id}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="w-4 h-4 mr-2 text-red-500 dark:text-red-400" />
                        <span>{detection.location}</span>
              </div>
            </div>

                    {/* Performance Metrics */}
                    {detection.processing_performance.length > 0 && (
                      <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Performance
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <div className={`font-mono font-medium ${getPerformanceColor(detection.processing_performance[0].dsp_time)}`}>
                              {detection.processing_performance[0].dsp_time}ms
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">DSP</div>
                          </div>
                          <div className="text-center">
                            <div className={`font-mono font-medium ${getPerformanceColor(detection.processing_performance[0].classification_time)}`}>
                              {detection.processing_performance[0].classification_time}ms
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">AI</div>
                          </div>
                          <div className="text-center">
                            <div className={`font-mono font-medium ${getPerformanceColor(detection.processing_performance[0].anomaly_time)}`}>
                              {detection.processing_performance[0].anomaly_time}ms
                            </div>
                            <div className="text-gray-500 dark:text-gray-400">Anomaly</div>
                          </div>
                        </div>
              </div>
            )}

                    {/* Status Indicator */}
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700 hover:bg-green-200 dark:hover:bg-green-900/50">
                          Human Detected
                        </Badge>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {globalIndex === 1 ? 'แรกสุด' : `ลำดับที่ ${globalIndex}`}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">การจัดการข้อมูล</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                เครื่องมือสำหรับจัดการข้อมูลการตรวจจับ
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                 onClick={() => fetchDetections(currentPage)}
                 className="w-full justify-start bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
               >
                 <Activity className="w-4 h-4 mr-2" />
                 รีเฟรชข้อมูลการตรวจจับ
              </Button>
          </CardContent>
        </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-gray-100">สถิติการตรวจจับ</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                ข้อมูลสรุปการทำงานของระบบ
              </CardDescription>
            </CardHeader>
            <CardContent>
                             <div className="space-y-4">
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600 dark:text-gray-400">การตรวจจับวันนี้</span>
                   <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                     {todayDetectionCount} ครั้ง
                   </Badge>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600 dark:text-gray-400">แสดงในหน้าปัจจุบัน</span>
                   <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                     {detections.length} รายการ
                   </Badge>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600 dark:text-gray-400">หน้าทั้งหมด (วันนี้)</span>
                   <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                     {totalPages} หน้า
                   </Badge>
                 </div>
                 <div className="flex items-center justify-between">
                   <span className="text-sm text-gray-600 dark:text-gray-400">สะสมทั้งหมด</span>
                   <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                     {totalDetectionCount} รายการ
                   </Badge>
                 </div>
               </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  )
} 