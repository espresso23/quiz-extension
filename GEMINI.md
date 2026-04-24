# AI Translator Project Context

AI Translator là một Chrome Extension (Manifest V3) hỗ trợ giải bài tập và dịch thuật dựa trên trí tuệ nhân tạo (thông qua OpenRouter). Dự án được thiết kế với mục tiêu hoạt động ổn định trên các nền tảng như LinkedIn Learning, Harvard ManageMentor, và Akajob/SkillUp.

## 🚀 Tổng quan kiến trúc

- **Background Service Worker (`background.js`)**: Trung tâm xử lý các yêu cầu API đến OpenRouter, quản lý cài đặt, menu ngữ cảnh và logic dự phòng (fallback) model.
- **Content Script (`content.js`)**: Thành phần chính chạy trên trang web, có nhiệm vụ phân tích cấu trúc DOM để tìm câu hỏi, hiển thị giao diện Sidebar và thực hiện chèn code giải (cho các bài tập lập trình).
- **Page Bridge (`page-bridge.js`)**: Một "cầu nối" được tiêm vào ngữ cảnh của trang web để vượt qua các hạn chế CSP (Content Security Policy), giúp chặn bắt các phản hồi mạng JSON (fetch/XHR) và tương tác trực tiếp với các trình soạn thảo code (như Monaco Editor).
- **Popup UI (`popup.html/js`)**: Giao diện cấu hình cho người dùng (API key, lựa chọn model, chế độ stealth).

## 🛠️ Công nghệ sử dụng

- **Ngôn ngữ**: Vanilla JavaScript (không dùng framework).
- **Nền tảng**: Chrome Extension MV3.
- **AI Backend**: OpenRouter API (hỗ trợ nhiều model như Gemini 2.0, DeepSeek V3, Claude 3.5 Sonnet).
- **Giao diện**: Shadow DOM và CSS tùy chỉnh để cô lập UI của extension khỏi trang web.

## 🏗️ Hướng dẫn phát triển và cài đặt

### Cài đặt
1. Truy cập `chrome://extensions/`.
2. Bật **Developer mode**.
3. Chọn **Load unpacked** và dẫn đến thư mục dự án này.
4. Cấu hình OpenRouter API Key trong phần Popup.

### Kiểm tra mã nguồn
Dự án sử dụng JavaScript thuần, bạn có thể kiểm tra cú pháp nhanh bằng lệnh:
```bash
node --check background.js
node --check content.js
node --check page-bridge.js
```

## 📜 Quy ước phát triển (Conventions)

- **Stealth Mode**: Ưu tiên sử dụng các tên class ngẫu nhiên (`Stealth.randomClassName()`), Shadow DOM và tránh sử dụng các biến toàn cục (global namespace) để không bị trang web phát hiện.
- **Dữ liệu**: Mọi câu hỏi được định danh bằng "fingerprint" để thực hiện cache và giảm thiểu số lần gọi API trùng lặp.
- **Xử lý AI**: 
    - Luôn ép AI trả về định dạng JSON nghiêm ngặt để parser dễ xử lý.
    - Đối với bài tập lập trình, AI được yêu cầu chỉ viết nội dung bên trong hàm (logic block) thay vì viết lại toàn bộ cấu trúc để tránh xung đột khi chèn code.
- **Đồng bộ hóa**: Cài đặt model và API key phải được đồng bộ giữa Popup, Sidebar và Background thông qua `chrome.storage.sync`.

## 📂 Cấu trúc thư mục quan trọng

- `background.js`: Logic xử lý API và Fallback.
- `content.js`: Logic UI và Parser DOM.
- `page-bridge.js`: Network interception và Editor hooks.
- `utils/`: Các module hỗ trợ cũ hoặc bổ trợ (stealth, parser).
- `icons/`: Tài nguyên hình ảnh.
