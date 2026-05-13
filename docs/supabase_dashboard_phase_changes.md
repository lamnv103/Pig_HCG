# Tài liệu thay đổi: Supabase Dashboard, lịch sử chẩn đoán, phác đồ AI ảnh và bản đồ thú y

## 1. Mục tiêu tổng thể

Đợt thay đổi này biến ứng dụng từ một công cụ chẩn đoán rời rạc thành một hệ thống có "trí nhớ" theo từng chủ trang trại.

Sau khi đăng nhập, mỗi người dùng có không gian dashboard riêng. Mọi kết quả từ hai nhánh chẩn đoán:

- Hệ chuyên gia Prolog.
- AI hình ảnh ProtoNet.

đều được tự động đóng gói và lưu vào bảng `diagnosis_history` trên Supabase theo đúng `user_id`.

Ngoài ra, kết quả từ AI hình ảnh không chỉ trả tên bệnh và độ tin cậy, mà còn được ghép với tri thức phác đồ điều trị từ Knowledge Base. Cuối cùng, trang bản đồ thú y được bổ sung để người dùng có thể tìm trạm/phòng khám/cửa hàng thuốc gần khu vực demo miền Trung.

## 2. Giai đoạn 1: Trí nhớ và Dashboard cá nhân hóa

### 2.1. Service làm việc với Supabase

File mới:

```text
frontend/src/services/diagnosisHistory.js
```

Service này là lớp trung gian duy nhất để frontend làm việc với bảng `diagnosis_history`.

Các hàm chính:

```js
fetchUserProfile(userId)
fetchDiagnosisHistory(userId, limit)
fetchMonthlyDiagnosisCount(userId, date)
saveExpertDiagnosis({ userId, symptomsInput, results })
saveVisionDiagnosis({ userId, file, result })
deleteDiagnosisHistory(userId)
```

### 2.2. Đảm bảo profile tồn tại trước khi lưu lịch sử

Vì bảng `diagnosis_history.user_id` đang tham chiếu tới `profiles(id)`, nếu tài khoản đã đăng nhập nhưng chưa có dòng profile thì insert lịch sử sẽ lỗi khóa ngoại.

Do đó service có hàm nội bộ:

```js
ensureProfileExists(userId)
```

Hàm này gọi:

```js
supabase.from('profiles').upsert({ id: userId }, { onConflict: 'id' })
```

Nhờ vậy, cả tài khoản cũ lẫn tài khoản mới đều có thể lưu lịch sử an toàn.

### 2.3. Lưu lịch sử Prolog

Trong file:

```text
frontend/src/App.jsx
```

Sau khi người dùng hoàn thành luồng hỏi đáp triệu chứng, app gọi API:

```js
diagnose(allSymptoms)
```

Khi backend trả kết quả, frontend tự động gọi:

```js
saveExpertDiagnosis({
  userId: session.user.id,
  symptomsInput: allSymptoms,
  results: resultData,
})
```

Không còn cần người dùng bấm nút "Lưu lịch sử".

Dữ liệu lưu vào Supabase:

- `user_id`: ID người dùng đang đăng nhập.
- `type`: `EXPERT`.
- `image_url`: `null`.
- `symptoms_input`: toàn bộ triệu chứng đã nhập.
- `diagnosis_results`: object JSON gồm nguồn chẩn đoán, bệnh chính, độ tin cậy, danh sách kết quả và phác đồ.

Payload ví dụ:

```json
{
  "source": "Hệ chuyên gia Prolog",
  "top_disease": "Đóng dấu son",
  "top_confidence": 92,
  "results": [
    {
      "disease_id": "dis_erysipelas",
      "disease": "Đóng dấu son",
      "confidence": 92,
      "hallmark": "Sốt cao, dấu đỏ/tím hình thoi trên da...",
      "prevention": "Vaccine, sát trùng, giảm stress.",
      "treatment": "Kháng sinh theo thú y, hạ sốt và trợ sức.",
      "rules_triggered": ["R014"]
    }
  ]
}
```

### 2.4. Lưu lịch sử AI hình ảnh

Trong file:

```text
frontend/src/components/ImageClassifier.jsx
```

Sau khi ProtoNet trả kết quả thành công, frontend tự gọi:

```js
saveVisionDiagnosis({ userId, file, result: data })
```

Dữ liệu lưu vào Supabase:

- `user_id`: ID người dùng đang đăng nhập.
- `type`: `VISION`.
- `image_url`: URL ảnh nếu upload Storage thành công.
- `symptoms_input`: `null`.
- `diagnosis_results`: object JSON gồm kết quả AI, bệnh chính, độ tin cậy, phác đồ và top dự đoán.

Payload ví dụ:

```json
{
  "source": "AI ProtoNet",
  "top_disease": "Đậu mùa lợn (Swinepox)",
  "top_confidence": 92,
  "english_name": "Infected_Viral_Swinepox",
  "disease_id": "dis_swinepox",
  "disease_detail": {
    "hallmark": "Mụn nước nhỏ, đóng vảy nâu đen...",
    "prevention": "Kiểm soát ký sinh trùng, vệ sinh chuồng...",
    "treatment": "Không có thuốc đặc hiệu; điều trị hỗ trợ..."
  },
  "top_predictions": [
    { "disease": "Đậu mùa lợn", "confidence": 92 }
  ],
  "results": [
    {
      "disease_id": "dis_swinepox",
      "disease": "Đậu mùa lợn (Swinepox)",
      "confidence": 92
    }
  ]
}
```

### 2.5. Upload ảnh chẩn đoán

Service `saveVisionDiagnosis` cố gắng upload ảnh lên Supabase Storage bucket:

```text
diagnosis-images
```

Nếu bucket này tồn tại và public, `image_url` sẽ được lưu vào bảng `diagnosis_history`.

Nếu bucket chưa tồn tại hoặc upload lỗi, service vẫn lưu kết quả chẩn đoán bình thường, chỉ để `image_url` là `null`. Điều này giúp app không bị hỏng chỉ vì thiếu Storage bucket.

### 2.6. Dashboard mới

File được viết lại:

```text
frontend/src/pages/HomePage.jsx
```

Dashboard hiện có các phần:

- Lời chào theo tên nông trại hoặc email.
- Thông tin hồ sơ nông trại như vị trí và quy mô đàn nếu có.
- Thống kê nhanh.
- Timeline các ca chẩn đoán gần nhất từ Supabase.
- Modal xem lại chi tiết từng ca bệnh.

Các thống kê nhanh:

- `Ca tháng này`: đếm số dòng `diagnosis_history` của user trong tháng hiện tại.
- `Tổng hồ sơ`: số ca gần nhất đang load về dashboard.
- `Nguy cơ cao`: số ca có độ tin cậy từ 80% trở lên.
- `Quét ảnh AI`: số ca có `type = VISION`.

### 2.7. Timeline lịch sử

Dashboard gọi:

```js
fetchDiagnosisHistory(userId, 30)
```

Query Supabase:

```js
supabase
  .from('diagnosis_history')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(limit)
```

Mỗi dòng timeline hiển thị:

- Loại chẩn đoán: Prolog hoặc AI hình ảnh.
- Tên bệnh chính.
- Ngày chẩn đoán.
- Độ tin cậy.
- Tóm tắt phác đồ điều trị.
- Ảnh thumbnail nếu có `image_url`.

### 2.8. Modal xem lại ca bệnh cũ

Khi bấm một ca bệnh trong timeline, `RecordDetailModal` mở lên và hiển thị:

- Tên bệnh.
- Nguồn chẩn đoán.
- Độ tin cậy.
- Ảnh chẩn đoán nếu có.
- Đặc điểm nhận biết.
- Phòng ngừa/xử lý.
- Phác đồ điều trị.
- Danh sách khả năng bệnh.
- Top dự đoán ProtoNet nếu là ca AI hình ảnh.
- Triệu chứng đã nhập nếu là ca Prolog.
- Nút chuyển sang bản đồ thú y.

## 3. Giai đoạn 2: Tích hợp phác đồ điều trị cho AI hình ảnh

### 3.1. Mapping từ class ProtoNet sang disease ID

Backend đã có mapping:

```py
ENGLISH_TO_DISEASE_ID = {
    "Infected_Viral_Swinepox": "dis_swinepox",
    "Infected_Viral_Foot_and_Mouth_Disease": "dis_fmd",
    ...
}
```

Khi model kết luận ảnh thuộc class `Infected_Viral_Swinepox`, backend suy ra:

```text
dis_swinepox
```

### 3.2. Backend đọc phác đồ từ Knowledge Base JSON

File backend đã cập nhật:

```text
python/main.py
```

Thêm đường dẫn:

```py
KNOWLEDGE_PATH = BASE_DIR / "data" / "pig_diagnostic_expert_system_v4_expanded.json"
```

Thêm hàm:

```py
load_disease_details_from_kb()
```

Hàm này đọc mảng `diseases` trong file JSON tri thức và tạo dictionary:

```py
details[disease_id] = {
    "name": disease.get("name"),
    "group": disease.get("group"),
    "age_focus": disease.get("age_focus"),
    "hallmark": disease.get("hallmark"),
    "cause": disease.get("cause"),
    "prevention": disease.get("prevention"),
    "treatment": disease.get("treatment") or disease.get("treatment_principle"),
}
```

Sau đó merge vào:

```py
DISEASE_DETAILS.update(load_disease_details_from_kb())
```

### 3.3. API `/api/predict` trả phiếu kết quả đầy đủ

Luồng xử lý:

1. Người dùng upload ảnh.
2. ProtoNet dự đoán class.
3. Backend lấy `english_name`.
4. Backend map `english_name` sang `disease_id`.
5. Backend tra `disease_id` trong `DISEASE_DETAILS`.
6. Backend trả thêm `disease_detail`.

Response có dạng:

```json
{
  "success": true,
  "predicted_class": "Đậu mùa lợn",
  "english_name": "Infected_Viral_Swinepox",
  "confidence": 92,
  "top_predictions": [],
  "disease_id": "dis_swinepox",
  "disease_detail": {
    "name": "Đậu mùa lợn (Swinepox)",
    "hallmark": "Mụn nước nhỏ...",
    "cause": "Swinepox virus...",
    "prevention": "Kiểm soát ký sinh trùng...",
    "treatment": "Không có thuốc đặc hiệu..."
  }
}
```

### 3.4. Trải nghiệm người dùng sau thay đổi

Người dùng dùng Prolog hay AI hình ảnh đều nhận được một phiếu kết quả y tế có cấu trúc tương tự:

- Tên bệnh.
- Độ tin cậy.
- Đặc điểm nhận biết.
- Phòng ngừa.
- Điều trị.
- Nguồn chẩn đoán.

Điều này giúp dashboard hiển thị lịch sử thống nhất và dễ xem lại.

## 4. Giai đoạn 3: Bản đồ thú y

File được viết lại:

```text
frontend/src/pages/VetMapPage.jsx
```

### 4.1. Cách hoạt động

Trang bản đồ dùng Google Maps iframe:

```js
https://www.google.com/maps?q={lat},{lng}&z=14&output=embed
```

Khi người dùng chọn một địa điểm trong danh sách, iframe đổi vị trí theo tọa độ của địa điểm đó.

### 4.2. Dữ liệu demo

Dữ liệu được hardcode trong mảng:

```js
VET_LOCATIONS
```

Mỗi địa điểm gồm:

- `name`: tên trạm/phòng khám/cửa hàng.
- `doctor`: bác sĩ hoặc người phụ trách.
- `address`: địa chỉ.
- `phone`: số hiển thị.
- `tel`: số dùng cho link gọi điện.
- `type`: loại địa điểm.
- `distance`: khoảng cách demo.
- `lat`, `lng`: tọa độ.
- `icon`, `accent`: dữ liệu hiển thị giao diện.

### 4.3. Giao diện

Trang bản đồ gồm hai vùng:

- Cột trái: danh sách các trạm thú y/phòng khám/cửa hàng thuốc.
- Vùng phải: Google Maps iframe.

Khi chọn một địa điểm, một thẻ thông tin trượt lên trên bản đồ, hiển thị:

- Tên địa điểm.
- Bác sĩ/người phụ trách.
- Địa chỉ.
- Khoảng cách demo.
- Nút `Gọi điện thoại khẩn cấp`.
- Nút `Mở Google Maps`.

## 5. Các file frontend đã thay đổi

### `frontend/src/App.jsx`

Vai trò mới:

- Quản lý Supabase session.
- Truyền `userId` cho dashboard và AI hình ảnh.
- Tự lưu kết quả Prolog sau khi chẩn đoán xong.
- Cập nhật `historyRefreshKey` để dashboard reload timeline sau khi có ca mới.

### `frontend/src/services/diagnosisHistory.js`

File mới, chịu trách nhiệm:

- Query profile.
- Query lịch sử chẩn đoán.
- Đếm số ca trong tháng.
- Lưu ca Prolog.
- Lưu ca AI ảnh.
- Upload ảnh lên Storage nếu có bucket.
- Xóa lịch sử theo user.

### `frontend/src/pages/HomePage.jsx`

Dashboard mới:

- Không còn dùng `localStorage`.
- Load dữ liệu từ Supabase.
- Hiển thị thống kê cá nhân hóa.
- Hiển thị timeline.
- Cho xem lại ca bệnh cũ trong modal.

### `frontend/src/components/DiagnosisResult.jsx`

Thay đổi:

- Bỏ nút lưu thủ công.
- Thêm trạng thái tự lưu:
  - `Đang lưu Supabase...`
  - `Đã tự động lưu vào hồ sơ`
  - `Chưa lưu được lịch sử`

### `frontend/src/components/ImageClassifier.jsx`

Thay đổi:

- Sau khi ProtoNet trả kết quả, tự gọi `saveVisionDiagnosis`.
- Hiển thị trạng thái tự lưu lên dashboard.
- Vẫn hiển thị phác đồ điều trị từ `disease_detail`.

### `frontend/src/pages/VetMapPage.jsx`

Thay đổi:

- Chuyển sang Google Maps iframe.
- Thêm danh sách điểm thú y demo.
- Thêm card thông tin trượt lên.
- Thêm nút gọi điện khẩn cấp.

## 6. Các file backend đã thay đổi

### `python/main.py`

Thay đổi:

- Import thêm `json`.
- Thêm `KNOWLEDGE_PATH`.
- Thêm hàm `load_disease_details_from_kb`.
- Merge dữ liệu phác đồ từ JSON Knowledge Base vào `DISEASE_DETAILS`.
- API `/api/predict` tiếp tục trả `disease_detail`, nhưng dữ liệu này giờ lấy từ tri thức JSON thay vì chỉ phụ thuộc dict hardcode.

## 7. Yêu cầu Supabase

### 7.1. Bảng `profiles`

Đã dùng schema:

```sql
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  farm_name TEXT,
  location TEXT,
  scale INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 7.2. Bảng `diagnosis_history`

Đã dùng schema:

```sql
CREATE TABLE public.diagnosis_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  type TEXT CHECK (type IN ('EXPERT', 'VISION')),
  image_url TEXT,
  symptoms_input JSONB,
  diagnosis_results JSONB
);
```

### 7.3. Storage bucket cho ảnh

Nếu muốn lưu ảnh và xem lại ảnh trong timeline, tạo Supabase Storage bucket:

```text
diagnosis-images
```

Khuyến nghị demo:

- Bucket public để `getPublicUrl` hoạt động đơn giản.
- Cho phép authenticated users upload.

Nếu chưa tạo bucket, app vẫn lưu lịch sử chẩn đoán nhưng không có ảnh.

## 8. Kiểm thử đã chạy

Frontend:

```bash
npm run lint
npm run build
```

Backend:

```bash
python -m py_compile python/main.py
```

Dev server frontend đang trả về HTTP 200 tại:

```text
http://127.0.0.1:5173
```

## 9. Lưu ý kỹ thuật

### 9.1. RLS hiện đang mở để test

Policy hiện tại:

```sql
CREATE POLICY "Allow public read/write access for testing"
ON diagnosis_history FOR ALL USING (true) WITH CHECK (true);
```

Policy này tiện cho demo, nhưng không phù hợp production. Khi hoàn thiện, nên đổi sang policy theo user:

```sql
auth.uid() = user_id
```

### 9.2. Dashboard đang lấy 30 ca gần nhất

Hiện tại:

```js
fetchDiagnosisHistory(userId, 30)
```

Nếu dữ liệu nhiều hơn, có thể bổ sung phân trang hoặc nút "Tải thêm".

### 9.3. Google Maps iframe không cần API key

Trang bản đồ dùng URL embed dạng query tọa độ, không dùng Google Maps JavaScript SDK, nên không cần API key cho demo.

Nếu sau này muốn vẽ marker thật, tính khoảng cách thật, hoặc định vị GPS người dùng, nên chuyển sang Google Maps API hoặc Leaflet.

### 9.4. Dữ liệu khoảng cách trong bản đồ là demo

Trường `distance` hiện là dữ liệu mô phỏng. Chưa có tính toán theo vị trí thực của người dùng.

## 10. Hướng mở rộng tiếp theo

- Tạo policy RLS chuẩn theo `auth.uid()`.
- Tạo bucket `diagnosis-images` và policy upload/read ảnh.
- Thêm chức năng ghi chú sau điều trị: hiệu quả thuốc, ngày khỏi bệnh, tái phát hay không.
- Thêm bộ lọc timeline theo loại chẩn đoán, bệnh, mức nguy cơ và khoảng ngày.
- Thêm realtime subscription để dashboard tự cập nhật khi có dòng `diagnosis_history` mới.
- Chuẩn hóa `diagnosis_results` thành versioned schema để tránh lỗi khi app nâng cấp payload trong tương lai.
