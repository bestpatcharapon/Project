#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Project_Detection_DATASET__inferencing.h>
#include "edge-impulse-sdk/dsp/image/image.hpp"
#include "esp_camera.h"

#define CAMERA_MODEL_AI_THINKER
#if defined(CAMERA_MODEL_AI_THINKER)
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22
#else
#error "Camera model not selected"
#endif

#define EI_CAMERA_RAW_FRAME_BUFFER_COLS           320
#define EI_CAMERA_RAW_FRAME_BUFFER_ROWS           240
#define EI_CAMERA_FRAME_BYTE_SIZE                 3

static bool debug_nn = false;
static bool is_initialised = false;
uint8_t *snapshot_buf;

static camera_config_t camera_config = {
    .pin_pwdn = PWDN_GPIO_NUM,
    .pin_reset = RESET_GPIO_NUM,
    .pin_xclk = XCLK_GPIO_NUM,
    .pin_sscb_sda = SIOD_GPIO_NUM,
    .pin_sscb_scl = SIOC_GPIO_NUM,
    .pin_d7 = Y9_GPIO_NUM,
    .pin_d6 = Y8_GPIO_NUM,
    .pin_d5 = Y7_GPIO_NUM,
    .pin_d4 = Y6_GPIO_NUM,
    .pin_d3 = Y5_GPIO_NUM,
    .pin_d2 = Y4_GPIO_NUM,
    .pin_d1 = Y3_GPIO_NUM,
    .pin_d0 = Y2_GPIO_NUM,
    .pin_vsync = VSYNC_GPIO_NUM,
    .pin_href = HREF_GPIO_NUM,
    .pin_pclk = PCLK_GPIO_NUM,
    .xclk_freq_hz = 20000000,
    .ledc_timer = LEDC_TIMER_0,
    .ledc_channel = LEDC_CHANNEL_0,
    .pixel_format = PIXFORMAT_JPEG,
    .frame_size = FRAMESIZE_QVGA,
    .jpeg_quality = 12,
    .fb_count = 1,
    .fb_location = CAMERA_FB_IN_PSRAM,
    .grab_mode = CAMERA_GRAB_WHEN_EMPTY,
};

// Network Configuration
const char* ssid = "Kanchada_2.4G";  // แก้ไขเป็น WiFi ของคุณ
const char* password = "kan123456789";  // แก้ไขเป็นรหัสผ่าน WiFi ของคุณ

// ESP32 #2 Gateway Configuration (ส่งข้อมูลไปยัง ESP32 #2)
const char* esp32GatewayIP = "192.168.1.100"; // IP ของ ESP32 #2 (ต้องดูจาก Serial Monitor ของ ESP32 #2)
const int esp32GatewayPort = 80;
String gatewayURL = "http://" + String(esp32GatewayIP) + "/detection";

unsigned long last_capture_time = 0;
const unsigned long capture_interval = 30000; // 30 วินาที

// Heartbeat Configuration
const char* heartbeatURL = "https://project-ex9u.onrender.com/api/esp32/heartbeat"; // URL สำหรับ heartbeat
unsigned long last_heartbeat_time = 0;
const unsigned long heartbeat_interval = 30000; // ส่ง heartbeat ทุก 30 วินาที

void sendDetectionToGateway(ei_impulse_result_t result) {
    HTTPClient http;
    http.begin(gatewayURL.c_str());
    http.addHeader("Content-Type", "application/json");

    // สร้าง JSON payload สำหรับเว็บแอปพลิเคชัน
    DynamicJsonDocument doc(2048);
    doc["device_id"] = "ESP32_Camera_01";
    doc["location"] = "Front Door";
    
    // ข้อมูลการประมวลผล
    doc["dsp_time"] = result.timing.dsp;
    doc["classification_time"] = result.timing.classification;
    doc["anomaly_time"] = result.timing.anomaly;
    
    // ตรวจสอบการตรวจจับคน
    bool humanDetected = false;
    float maxConfidence = 0.0;
    String detectedObjects = "";
    
    for (uint32_t i = 0; i < result.bounding_boxes_count; i++) {
        ei_impulse_result_bounding_box_t bb = result.bounding_boxes[i];
        if (bb.value == 0) continue;
        
        if (detectedObjects.length() > 0) detectedObjects += ", ";
        detectedObjects += String(bb.label) + " (" + String(bb.value * 100, 1) + "%)";
        
        // ตรวจสอบว่าพบคนหรือไม่
        if (strcmp(bb.label, "human") == 0 && bb.value > 0.5) {
            humanDetected = true;
            if (bb.value > maxConfidence) {
                maxConfidence = bb.value;
            }
        }
    }
    
    doc["human_detected"] = humanDetected;
    doc["confidence"] = maxConfidence;
    doc["detected_objects"] = detectedObjects;
    
    String jsonString;
    serializeJson(doc, jsonString);

    Serial.println("📤 Sending detection data to ESP32 Gateway:");
    Serial.println(jsonString);

    int httpResponseCode = http.POST(jsonString);

    if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("✅ Data sent to gateway successfully. Response code: %d\n", httpResponseCode);
        Serial.printf("Gateway response: %s\n", response.c_str());
    } else {
        Serial.printf("❌ Error sending to gateway: %s\n", http.errorToString(httpResponseCode).c_str());
        Serial.println("💡 Make sure ESP32 #2 Gateway is running and check IP address");
    }

    http.end();
}

void sendHeartbeat() {
    HTTPClient http;
    http.begin(heartbeatURL);
    http.addHeader("Content-Type", "application/json");

    // สร้าง JSON payload สำหรับ heartbeat
    DynamicJsonDocument doc(512);
    doc["device_id"] = "ESP32_Camera_01";
    doc["timestamp"] = millis();
    doc["location"] = "Front Door";
    doc["version"] = "1.0.0";
    doc["wifi_strength"] = WiFi.RSSI();
    doc["uptime"] = millis() / 1000;  // วินาที
    doc["free_heap"] = ESP.getFreeHeap();
    doc["device_type"] = "camera";
    doc["status"] = "active";

    String jsonString;
    serializeJson(doc, jsonString);

    Serial.println("💓 Sending heartbeat to web app:");
    Serial.println(jsonString);

    int httpResponseCode = http.POST(jsonString);

    if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.printf("✅ Heartbeat sent successfully. Response code: %d\n", httpResponseCode);
        Serial.printf("Response: %s\n", response.c_str());
    } else {
        Serial.printf("❌ Error sending heartbeat: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
}

bool ei_camera_init(void);
void ei_camera_deinit(void);
bool ei_camera_capture(uint32_t img_width, uint32_t img_height, uint8_t *out_buf);
static int ei_camera_get_data(size_t offset, size_t length, float *out_ptr);

void setup() {
    Serial.begin(115200);
    Serial.println("ESP32 Human Detection System - Web App Integration");

    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.println("Connecting to WiFi...");
    }
    Serial.println("✅ Connected to WiFi");
    Serial.print("📍 Camera IP: ");
    Serial.println(WiFi.localIP());

    if (!ei_camera_init()) {
        ei_printf("❌ Failed to initialize Camera!\r\n");
    } else {
        ei_printf("✅ Camera initialized\r\n");
    }

    ei_printf("\n🔍 Starting human detection every 30 seconds...\n");
    ei_printf("📡 Sending data to ESP32 Gateway: %s\n", gatewayURL.c_str());
    ei_printf("💓 Sending heartbeat to: %s\n", heartbeatURL);
    ei_printf("⚠️  Make sure ESP32 #2 Gateway is running first!\n");
    
    // ส่ง heartbeat ครั้งแรก
    sendHeartbeat();
    ei_sleep(2000);
}

void loop() {
    // ส่ง heartbeat ทุก 30 วินาที
    if (millis() - last_heartbeat_time >= heartbeat_interval) {
        last_heartbeat_time = millis();
        sendHeartbeat();
    }
    
    if (millis() - last_capture_time >= capture_interval) {
        last_capture_time = millis();

        if (ei_sleep(5) != EI_IMPULSE_OK) return;

        snapshot_buf = (uint8_t*)malloc(EI_CAMERA_RAW_FRAME_BUFFER_COLS * EI_CAMERA_RAW_FRAME_BUFFER_ROWS * EI_CAMERA_FRAME_BYTE_SIZE);
        if (snapshot_buf == nullptr) {
            ei_printf("ERR: Failed to allocate snapshot buffer!\n");
            return;
        }

        ei::signal_t signal;
        signal.total_length = EI_CLASSIFIER_INPUT_WIDTH * EI_CLASSIFIER_INPUT_HEIGHT;
        signal.get_data = &ei_camera_get_data;

        if (!ei_camera_capture(EI_CLASSIFIER_INPUT_WIDTH, EI_CLASSIFIER_INPUT_HEIGHT, snapshot_buf)) {
            ei_printf("Failed to capture image\r\n");
            free(snapshot_buf);
            return;
        }

        ei_impulse_result_t result = { 0 };
        EI_IMPULSE_ERROR err = run_classifier(&signal, &result, debug_nn);
        if (err != EI_IMPULSE_OK) {
            ei_printf("ERR: Failed to run classifier (%d)\n", err);
            free(snapshot_buf);
            return;
        }

        // ส่งข้อมูลไปยัง ESP32 Gateway
        sendDetectionToGateway(result);

        // แสดงผลในหน้าจอ
        ei_printf("Predictions (DSP: %d ms., Classification: %d ms., Anomaly: %d ms.): \n",
                  result.timing.dsp, result.timing.classification, result.timing.anomaly);

    #if EI_CLASSIFIER_OBJECT_DETECTION == 1
        ei_printf("Object detection bounding boxes:\r\n");
        for (uint32_t i = 0; i < result.bounding_boxes_count; i++) {
            ei_impulse_result_bounding_box_t bb = result.bounding_boxes[i];
            if (bb.value == 0) continue;

            ei_printf("  %s (%f) [ x: %u, y: %u, width: %u, height: %u ]\r\n",
                      bb.label, bb.value, bb.x, bb.y, bb.width, bb.height);
        }
    #endif

        free(snapshot_buf);
    }

    delay(100);
}

// Camera functions (unchanged from original)
bool ei_camera_init(void) {
    if (is_initialised) return true;
    esp_err_t err = esp_camera_init(&camera_config);
    if (err != ESP_OK) {
        Serial.printf("Camera init failed with error 0x%x\n", err);
        return false;
    }
    sensor_t * s = esp_camera_sensor_get();
    if (s->id.PID == OV3660_PID) {
        s->set_vflip(s, 1);
        s->set_brightness(s, 1);
        s->set_saturation(s, 0);
    }
    is_initialised = true;
    return true;
}

void ei_camera_deinit(void) {
    esp_err_t err = esp_camera_deinit();
    if (err != ESP_OK) {
        ei_printf("Camera deinit failed\n");
    }
    is_initialised = false;
}

bool ei_camera_capture(uint32_t img_width, uint32_t img_height, uint8_t *out_buf) {
    bool do_resize = false;
    if (!is_initialised) {
        ei_printf("ERR: Camera is not initialized\r\n");
        return false;
    }
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
        ei_printf("Camera capture failed\n");
        return false;
    }
    bool converted = fmt2rgb888(fb->buf, fb->len, PIXFORMAT_JPEG, snapshot_buf);
    esp_camera_fb_return(fb);
    if (!converted) {
        ei_printf("Conversion failed\n");
        return false;
    }
    if ((img_width != EI_CAMERA_RAW_FRAME_BUFFER_COLS) || (img_height != EI_CAMERA_RAW_FRAME_BUFFER_ROWS)) {
        do_resize = true;
    }
    if (do_resize) {
        ei::image::processing::crop_and_interpolate_rgb888(
            out_buf, EI_CAMERA_RAW_FRAME_BUFFER_COLS, EI_CAMERA_RAW_FRAME_BUFFER_ROWS,
            out_buf, img_width, img_height);
    }
    return true;
}

static int ei_camera_get_data(size_t offset, size_t length, float *out_ptr) {
    size_t pixel_ix = offset * 3;
    size_t pixels_left = length;
    size_t out_ptr_ix = 0;
    while (pixels_left != 0) {
        out_ptr[out_ptr_ix] = (snapshot_buf[pixel_ix + 2] << 16) + 
                              (snapshot_buf[pixel_ix + 1] << 8) + 
                              snapshot_buf[pixel_ix];
        out_ptr_ix++;
        pixel_ix += 3;
        pixels_left--;
    }
    return 0;
} 