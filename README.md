# 🐷 Frontend Pig Diagnostic System

Dự án Frontend cho Hệ thống Chẩn đoán Bệnh Heo, được xây dựng bằng **React**, **Vite** và **Tailwind CSS**. 

Tài liệu này mô tả chi tiết kiến trúc thư mục, chức năng của các file trọng tâm và cách hệ thống tương tác với Backend (FastAPI) thông qua luồng chẩn đoán dựa trên Hệ số Niềm tin (Certainty Factor - CF).

---

## 🎯 Mục tiêu Frontend

Frontend đóng vai trò là giao diện tương tác trực tiếp với người dùng, chịu trách nhiệm:
* **Thu thập dữ liệu:** Nhận input triệu chứng từ người dùng theo thang CF (-1 đến 1).
* **Giao tiếp API:** Gửi dữ liệu triệu chứng dạng payload lên API chẩn đoán (`POST /api/diagnose`).
* **Hiển thị kết quả:** Trình bày kết quả trực quan bao gồm tên bệnh, độ tin cậy (`confidence`), danh sách các luật đã kích hoạt (`rules_triggered`) và thông tin chi tiết về bệnh từ tập tri thức đồng bộ.

---

## 🔄 Sơ đồ Tương tác Tổng quát

```text
[ Người dùng ]
      │
      ▼
(SymptomInput.jsx) ─── Nhập CF ───> (App.jsx)
                                        │
                                        ▼
                                    (api.js) ─── Gửi POST ──> [ FastAPI: /api/diagnose ]
                                        │                             │
                                        ◄────── Trả về JSON ──────────┘
                                        │
                                        ▼
(knowledge.js) ────── Map ID ─────> (ResultCard.jsx) ─── Hiển thị kết quả ──> [ Người dùng ]

📂 Cấu trúc File & Vai trò
Dự án gồm 18 file trọng tâm (không tính node_modules/ và dist/). Dưới đây là bảng phân loại và chức năng chi tiết:

1. Nhóm Cấu hình & Môi trường

File,Vai trò,Tương tác chính
package.json,"Khai báo dependencies và NPM scripts (dev, build, sync:knowledge).",Trung tâm điều phối môi trường và thư viện.
package-lock.json,Khóa phiên bản dependency.,Dùng bởi npm khi chạy npm install.
vite.config.js,"Cấu hình Vite (plugins, build/dev behavior).",Đọc bởi Vite khi khởi chạy hoặc build.
tailwind.config.js,"Cấu hình Tailwind (đường dẫn quét class, theme, colors).",Kết hợp với index.css để render utility classes.
postcss.config.js,Kích hoạt plugin tailwindcss và autoprefixer.,Dùng bởi Vite/PostCSS khi build CSS.
eslint.config.js,Chứa các quy tắc lint cho JavaScript/React.,Dùng bởi lệnh npm run lint.
.gitignore,Loại trừ file/thư mục không cần commit lên Git.,Giữ repository sạch sẽ.

2. Nhóm Source Code React (Core Logic)

File,Vai trò,Tương tác chính
index.html,"Entry point của Vite, chứa thẻ <div id=""root"">.",Nơi React mount toàn bộ ứng dụng.
src/main.jsx,Entry JS của React. Render <App /> vào #root.,"Nối index.html với UI React, import global CSS."
src/App.jsx,"Container chính. Quản lý state (isLoading, results).","Gọi api.js, truyền props cho Input và Result components."
src/api.js,"Cấu hình Axios instance, export hàm diagnose().",Gọi POST /api/diagnose tới Backend.
src/index.css,Khai báo global styles và @tailwind directives.,Áp dụng style cho toàn bộ ứng dụng.
src/components/SymptomInput.jsx,"UI nhập triệu chứng CF (slider, number, search, reset).","Đọc knowledge.js, gửi payload lên App.jsx."
src/components/ResultCard.jsx,"Hiển thị kết quả chẩn đoán, progress bar độ tin cậy.","Nhận dữ liệu từ App.jsx, map data từ knowledge.js."

3. Nhóm Tri thức & Tài nguyên

File,Vai trò,Tương tác chính
src/data/knowledge.js,Lưu trữ tri thức frontend (symptom/disease catalog).,Cung cấp data cho SymptomInput và ResultCard.
scripts/sync_knowledge.py,Parse prolog/rules.pl để sinh file knowledge.js.,Chạy qua lệnh npm run sync:knowledge.
public/favicon.svg,Icon tab trình duyệt.,Trình duyệt tự động load.
public/icons.svg,Sprite icon dùng cho giao diện (nếu có).,Tham chiếu từ các UI components.

Hướng dẫn Cài đặt & Chạy Dự án
1. Khởi động Backend (FastAPI)
Đảm bảo bạn đang ở thư mục gốc của backend và môi trường ảo (nếu có) đã được kích hoạt:
python -m uvicorn main:app --reload --app-dir python --port 8000

2. Khởi động Frontend (React/Vite)
Mở một terminal mới, di chuyển vào thư mục frontend và chạy:

cd frontend
npm install
npm run dev

Truy cập ứng dụng tại: http://localhost:5173

Quy trình Đồng bộ Tri thức (Knowledge Sync)
Hệ thống cho phép đồng bộ tự động dữ liệu từ file Prolog sang Frontend. Mỗi khi bạn có cập nhật hoặc chỉnh sửa các luật trong file prolog/rules.pl:

Mở terminal tại thư mục frontend.

Chạy lệnh đồng bộ:

Bash
npm run sync:knowledge
Script sync_knowledge.py sẽ tự động parse file Prolog và tạo lại bản cập nhật cho src/data/knowledge.js. Các thành phần UI sẽ ngay lập tức sử dụng dữ liệu mới.

📌 Lưu ý khi Triển khai (Deployment)
Phiên bản tương thích: Frontend sử dụng vite@5.x và @vitejs/plugin-react@4.x, cần Node.js phiên bản tương ứng (khuyến nghị Node 18+).

Bảo mật & Môi trường: * Cấu hình biến môi trường VITE_API_BASE_URL trỏ về domain thật của Backend khi deploy.

Cấu hình lại CORS trên Backend sao cho chỉ cho phép domain của Frontend gọi API.

Cân nhắc thêm cơ chế Authentication hoặc Rate Limiting cho endpoint chẩn đoán để tránh lạm dụng.# Pig_HCG
