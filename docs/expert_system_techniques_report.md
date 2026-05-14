# Báo cáo: Các kỹ thuật Hệ Chuyên gia trong Project Pig

## 1. Tổng quan dự án

Project Pig là hệ thống hỗ trợ chẩn đoán bệnh trên heo, kết hợp ba thành phần chính:

- Hệ Chuyên gia dựa trên luật Prolog để chẩn đoán từ triệu chứng.
- Mô hình AI hình ảnh ProtoNet để nhận diện một số bệnh ngoài da từ ảnh.
- Supabase để xác thực người dùng và lưu lịch sử chẩn đoán theo từng chủ trang trại.

Trong đó, phần Hệ Chuyên gia là lõi suy luận chính của nhánh chẩn đoán bằng triệu chứng. Người dùng trả lời các câu hỏi về biểu hiện bệnh, hệ thống chuyển các câu trả lời thành mức độ tin cậy, sau đó Prolog dùng tập luật để suy luận ra bệnh có khả năng cao nhất.

Các file quan trọng liên quan đến Hệ Chuyên gia:

```text
prolog/rules.pl
python/main.py
frontend/src/App.jsx
frontend/src/components/DynamicInterview.jsx
frontend/src/components/DiagnosisResult.jsx
frontend/src/data/knowledge.js
```

## 2. Vai trò của Hệ Chuyên gia trong hệ thống

Hệ Chuyên gia trong dự án đóng vai trò mô phỏng quá trình suy luận của bác sĩ thú y khi chẩn đoán bệnh dựa trên triệu chứng.

Thay vì chỉ dùng mô hình học máy để đoán bệnh, hệ thống biểu diễn tri thức chuyên môn dưới dạng:

- Danh mục triệu chứng.
- Danh mục bệnh.
- Phác đồ điều trị và phòng ngừa.
- Các luật suy luận dạng nếu - thì.
- Mức độ tin cậy cho từng luật.

Ví dụ về tư duy chuyên gia:

```text
Nếu heo sốt rất cao
và trên da có ban đỏ/tím hình vuông hoặc hình thoi
thì có khả năng cao mắc bệnh Đóng dấu son.
```

Trong Prolog, tri thức này được biểu diễn bằng một luật như:

```prolog
rule('R_Ery', [sym_sot_rat_cao, sym_ban_hinh_vuong_thoi], dis_erysipelas, 0.98, 3).
```

Ý nghĩa:

- `R_Ery`: mã luật.
- `[sym_sot_rat_cao, sym_ban_hinh_vuong_thoi]`: danh sách triệu chứng cần có.
- `dis_erysipelas`: bệnh được suy ra.
- `0.98`: độ tin cậy cơ sở của luật.
- `3`: mức ưu tiên của luật.

Nhờ cách biểu diễn này, hệ thống có thể giải thích vì sao nó đưa ra kết luận, thay vì chỉ trả ra một kết quả như hộp đen.

## 3. Cơ sở tri thức

Cơ sở tri thức là phần lưu giữ kiến thức chuyên môn của hệ thống. Trong dự án, cơ sở tri thức được đặt chủ yếu trong:

```text
prolog/rules.pl
data/pig_diagnostic_expert_system_v4_expanded.json
frontend/src/data/knowledge.js
```

### 3.1. Triệu chứng

Các triệu chứng được định danh bằng mã để hệ thống xử lý ổn định, ví dụ:

```prolog
symptom(sym_sot_rat_cao, 'Lợn có bị sốt rất cao (41.5 - 42.5°C) không?').
symptom(sym_ban_hinh_vuong_thoi, 'Trên da có các đốm đỏ/tím hình vuông, hình thoi không?').
```

Mỗi triệu chứng gồm:

- ID triệu chứng: dùng trong luật và payload API.
- Câu hỏi tiếng Việt: dùng để hiển thị cho người dùng.

Frontend sử dụng danh sách triệu chứng để tạo luồng hỏi đáp. Khi người dùng trả lời, dữ liệu được gửi về backend dưới dạng object gồm ID triệu chứng và giá trị CF.

### 3.2. Bệnh

Mỗi bệnh được mô tả bằng fact `disease(...)` trong Prolog:

```prolog
disease(
  dis_erysipelas,
  'Đóng dấu son',
  'systemic',
  'heo thịt - nái',
  'Sốt cao, dấu đỏ/tím hình thoi trên da, có thể sưng khớp.',
  'Erysipelothrix rhusiopathiae.',
  'Vaccine, sát trùng, giảm stress.',
  'Kháng sinh theo thú y, hạ sốt và trợ sức.',
  0.85
).
```

Các thành phần chính:

- ID bệnh.
- Tên bệnh.
- Nhóm bệnh.
- Độ tuổi hay nhóm heo thường gặp.
- Dấu hiệu điển hình.
- Nguyên nhân.
- Hướng phòng ngừa.
- Hướng điều trị.
- Ngưỡng tin cậy tối thiểu để bệnh được trả về.

Ngưỡng tin cậy giúp hệ thống không trả ra những bệnh có bằng chứng quá yếu.

### 3.3. Luật suy luận

Luật suy luận là phần quan trọng nhất của Hệ Chuyên gia. Các luật nằm trong `prolog/rules.pl` với cấu trúc:

```prolog
rule(RuleId, Symptoms, Disease, BaseCF, Priority).
```

Ví dụ:

```prolog
rule('R_FMD_Main', [sym_sot_vua_den_cao, sym_mun_nuoc_mong_mieng], dis_fmd, 0.90, 2).
```

Ý nghĩa:

```text
Nếu heo sốt vừa đến cao
và có mụn nước/vết loét ở móng hoặc miệng
thì nghi ngờ bệnh Lở mồm long móng
với độ tin cậy cơ sở 0.90
và mức ưu tiên 2.
```

Các luật này thể hiện tri thức của chuyên gia thú y dưới dạng có thể xử lý bằng máy.

## 4. Bộ nhớ làm việc

Bộ nhớ làm việc là nơi lưu các dữ kiện tạm thời trong một phiên chẩn đoán. Trong dự án, bộ nhớ làm việc được biểu diễn bằng fact động:

```prolog
:- dynamic known/2.
known(SymptomId, UserCF).
```

Trong đó:

- `SymptomId`: ID triệu chứng.
- `UserCF`: mức độ người dùng xác nhận triệu chứng, nằm trong khoảng từ `-1.0` đến `1.0`.

Ví dụ:

```prolog
known(sym_sot_rat_cao, 1.0).
known(sym_ban_hinh_vuong_thoi, 0.8).
```

Ý nghĩa:

- Người dùng rất chắc chắn heo bị sốt rất cao.
- Người dùng khá chắc chắn có ban hình vuông/hình thoi trên da.

Trong backend `python/main.py`, trước mỗi lần chẩn đoán, hệ thống xóa dữ kiện cũ:

```py
list(prolog.query("retractall(known(_, _))"))
```

Sau đó nạp triệu chứng mới:

```py
prolog.assertz(f"known({sym}, {clean_cf})")
```

Điều này bảo đảm mỗi lượt chẩn đoán độc lập, không bị lẫn dữ liệu từ lần trước.

## 5. Động cơ suy luận

Động cơ suy luận là phần dùng các dữ kiện trong bộ nhớ làm việc để kích hoạt luật và suy ra bệnh.

Trong `prolog/rules.pl`, quá trình suy luận gồm các bước chính:

1. Lấy triệu chứng người dùng đã cung cấp.
2. Kiểm tra các luật có thỏa mãn hay không.
3. Tính độ tin cậy của từng luật.
4. Gom nhiều luật cùng kết luận về một bệnh.
5. Kết hợp các CF theo công thức MYCIN.
6. Lọc bệnh theo ngưỡng.
7. Sắp xếp kết quả theo độ tin cậy giảm dần.
8. Trả về bệnh, độ tin cậy và danh sách luật đã kích hoạt.

### 5.1. Lấy dữ kiện triệu chứng

Prolog dùng predicate:

```prolog
has_symptom(S, CF) :- known(S, CF), !.
has_symptom(_, 0.0).
```

Nếu triệu chứng đã được người dùng trả lời, hệ thống lấy giá trị CF tương ứng. Nếu chưa có dữ liệu, hệ thống mặc định CF là `0.0`, nghĩa là chưa có bằng chứng.

### 5.2. Kiểm tra danh sách triệu chứng của luật

Một luật thường cần nhiều triệu chứng cùng xuất hiện. Hệ thống kiểm tra danh sách triệu chứng bằng:

```prolog
check_symptoms([], 1.0).
check_symptoms([H|T], MinCF) :-
    has_symptom(H, CF1),
    check_symptoms(T, CF2),
    PosCF1 is max(0.0, CF1),
    PosCF2 is max(0.0, CF2),
    MinCF is min(PosCF1, PosCF2).
```

Ở đây hệ thống dùng giá trị nhỏ nhất trong các triệu chứng làm mức thỏa mãn của luật. Đây là cách mô phỏng toán tử AND:

```text
Một luật chỉ mạnh khi tất cả triệu chứng trong luật đều có bằng chứng đủ mạnh.
```

Ví dụ:

```text
sym_sot_rat_cao = 1.0
sym_ban_hinh_vuong_thoi = 0.8
```

Mức thỏa mãn của luật là:

```text
min(1.0, 0.8) = 0.8
```

## 6. Kỹ thuật Certainty Factor

Certainty Factor là kỹ thuật biểu diễn mức độ tin cậy thường gặp trong các Hệ Chuyên gia kiểu MYCIN.

Trong dự án, CF có khoảng giá trị:

```text
-1.0 đến 1.0
```

Ý nghĩa:

- `1.0`: rất chắc chắn có triệu chứng hoặc kết luận đúng.
- `0.0`: không có thông tin.
- `-1.0`: rất chắc chắn triệu chứng hoặc kết luận không đúng.

Frontend thu thập mức độ triệu chứng từ người dùng, backend giới hạn giá trị bằng hàm:

```py
def clamp_cf(value):
    return max(-1.0, min(1.0, float(value)))
```

Điều này tránh trường hợp dữ liệu đầu vào vượt khỏi phạm vi hợp lệ.

### 6.1. Tính CF cho một luật

Trong Prolog, CF của một luật được tính theo công thức:

```text
CF_rule_final = BaseCF * CF_symptoms * PriorityWeight
```

Trong đó:

- `BaseCF`: độ tin cậy cơ sở của luật.
- `CF_symptoms`: mức thỏa mãn của các triệu chứng trong luật.
- `PriorityWeight`: trọng số ưu tiên.

Ví dụ với luật:

```prolog
rule('R_Ery', [sym_sot_rat_cao, sym_ban_hinh_vuong_thoi], dis_erysipelas, 0.98, 3).
```

Giả sử:

```text
sym_sot_rat_cao = 1.0
sym_ban_hinh_vuong_thoi = 0.8
BaseCF = 0.98
Priority = 3
PriorityWeight = 1.3
```

Khi đó:

```text
CF_symptoms = min(1.0, 0.8) = 0.8
CF_raw = 0.98 * 0.8 * 1.3 = 1.0192
```

Vì CF không được vượt quá `1.0`, hệ thống clamp kết quả:

```text
CF_rule_final = 1.0
```

### 6.2. Kết hợp nhiều luật theo MYCIN

Một bệnh có thể được suy ra bởi nhiều luật khác nhau. Ví dụ bệnh ASF có thể được gợi ý bởi luật dịch tễ, luật sốt cao, luật xuất huyết, luật chết nhanh hàng loạt.

Do đó hệ thống cần kết hợp nhiều CF thành một CF cuối cùng.

Trong `rules.pl`, hệ thống dùng công thức MYCIN:

```prolog
combine_cf(CF1, CF2, CF) :-
    CF1 >= 0, CF2 >= 0, !,
    CF is CF1 + CF2 - (CF1 * CF2).
```

Trường hợp hai bằng chứng cùng dương:

```text
CF = CF1 + CF2 - CF1 * CF2
```

Ví dụ:

```text
CF1 = 0.7
CF2 = 0.6
CF = 0.7 + 0.6 - 0.7 * 0.6
CF = 0.88
```

Điều này thể hiện rằng nhiều bằng chứng cùng ủng hộ một bệnh sẽ làm độ tin cậy tăng lên, nhưng không vượt quá 1.0.

Hệ thống cũng có công thức cho trường hợp hai CF cùng âm hoặc trái dấu. Nhờ vậy, hệ thống xử lý được cả bằng chứng ủng hộ và bằng chứng phản đối.

## 7. Priority weight, threshold và noise filter

### 7.1. Priority weight

Không phải luật nào cũng quan trọng như nhau. Một số luật có giá trị chẩn đoán mạnh hơn vì triệu chứng đặc hiệu hơn.

Trong `rules.pl`, hệ thống định nghĩa trọng số ưu tiên:

```prolog
priority_weight(1, 0.8).
priority_weight(2, 1.0).
priority_weight(3, 1.3).
```

Ý nghĩa:

- Priority 1: luật mềm, bằng chứng yếu hơn.
- Priority 2: luật chính, độ tin cậy bình thường.
- Priority 3: luật mạnh hoặc triệu chứng rất đặc hiệu.

Ví dụ:

```prolog
rule('R_ASF_Epidemic', [sym_lay_lan_nhanh, sym_chet_nhanh_hang_loat, sym_xuat_huyet_da], dis_asf, 0.99, 3).
```

Luật này có priority 3 vì các dấu hiệu lây lan nhanh, chết hàng loạt và xuất huyết là bằng chứng dịch tễ nghiêm trọng.

### 7.2. Threshold theo từng bệnh

Mỗi bệnh có một ngưỡng CF riêng:

```prolog
disease_threshold(DiseaseId, Threshold) :-
    disease(DiseaseId, _, _, _, _, _, _, _, Threshold).
```

Sau khi tính CF cuối cùng, hệ thống chỉ giữ lại bệnh nếu:

```prolog
CF >= Threshold
```

Ví dụ:

```text
dis_erysipelas có threshold 0.85
```

Nếu CF cuối cùng của bệnh này chỉ là `0.60`, hệ thống sẽ không trả bệnh đó vì bằng chứng chưa đủ mạnh.

### 7.3. Noise filter

Hệ thống loại bỏ các luật có ảnh hưởng quá nhỏ:

```prolog
abs(CF_rule_final) >= 0.2.
```

Điều này giúp kết quả không bị nhiễu bởi những luật có độ tin cậy rất thấp.

## 8. Explainability - khả năng giải thích kết quả

Một điểm quan trọng của Hệ Chuyên gia là khả năng giải thích được kết luận.

Trong dự án, mỗi kết quả trả về có:

```json
{
  "disease": "dis_erysipelas",
  "confidence": 100,
  "rules_triggered": ["R_Ery"]
}
```

Trường `rules_triggered` cho biết luật nào đã kích hoạt để dẫn đến kết luận.

Trong Prolog, danh sách luật được gom bằng:

```prolog
findall(CF-RuleId, diagnose_rule(Disease, RuleId, CF), Results)
```

Sau đó tách ra:

```prolog
extract_rules(Results, TriggeredRules)
```

Frontend hiển thị phần giải thích này trong `DiagnosisResult.jsx` dưới mục:

```text
Tại sao hệ thống kết luận bệnh này?
```

Khi người dùng mở phần giải thích, họ thấy các rule đã kích hoạt. Đây là lợi thế lớn so với mô hình AI hộp đen, vì người dùng có thể biết hệ thống dựa vào dấu hiệu nào để suy luận.

## 9. Luồng tích hợp từ frontend đến Prolog

Luồng chẩn đoán bằng triệu chứng diễn ra như sau:

```text
Người dùng
  ↓
React frontend
  ↓
App.jsx gom triệu chứng
  ↓
api.js gọi POST /api/diagnose
  ↓
FastAPI nhận payload
  ↓
python/main.py assert known(...) vào Prolog
  ↓
Prolog chạy diagnose_all(Result)
  ↓
FastAPI format kết quả JSON
  ↓
React hiển thị phiếu chẩn đoán
  ↓
Supabase lưu lịch sử chẩn đoán
```

### 9.1. Payload từ frontend

Frontend gửi dữ liệu dạng:

```json
{
  "symptoms": {
    "sym_sot_rat_cao": 1,
    "sym_ban_hinh_vuong_thoi": 0.8
  }
}
```

### 9.2. Backend nạp dữ liệu vào Prolog

Trong `python/main.py`, endpoint `/api/diagnose` thực hiện:

```py
for sym, cf in data.symptoms.items():
    clean_cf = clamp_cf(cf)
    prolog.assertz(f"known({sym}, {clean_cf})")
```

Sau đó gọi:

```py
results = list(prolog.query("diagnose_all(Result)"))
```

### 9.3. Backend trả kết quả

Kết quả được format thành JSON:

```json
{
  "status": "success",
  "total": 1,
  "data": [
    {
      "disease": "dis_erysipelas",
      "confidence": 100,
      "rules_triggered": ["R_Ery"]
    }
  ]
}
```

### 9.4. Frontend hiển thị kết quả

Frontend dùng `diseaseById` trong `knowledge.js` để đổi ID bệnh thành thông tin đầy đủ:

- Tên bệnh.
- Nguyên nhân.
- Đặc điểm nhận biết.
- Phòng ngừa.
- Điều trị.

Nhờ vậy backend chỉ cần trả ID bệnh và độ tin cậy, còn frontend vẫn hiển thị được phiếu kết quả dễ hiểu cho người dùng.

## 10. Ví dụ minh họa một lượt suy luận

Giả sử người dùng trả lời:

```text
Heo bị sốt rất cao: 1.0
Da có ban hình vuông/hình thoi: 0.8
```

Frontend gửi:

```json
{
  "symptoms": {
    "sym_sot_rat_cao": 1.0,
    "sym_ban_hinh_vuong_thoi": 0.8
  }
}
```

Backend nạp vào Prolog:

```prolog
known(sym_sot_rat_cao, 1.0).
known(sym_ban_hinh_vuong_thoi, 0.8).
```

Prolog xét luật:

```prolog
rule('R_Ery', [sym_sot_rat_cao, sym_ban_hinh_vuong_thoi], dis_erysipelas, 0.98, 3).
```

Tính toán:

```text
CF_symptoms = min(1.0, 0.8) = 0.8
BaseCF = 0.98
PriorityWeight = 1.3
CF_raw = 0.98 * 0.8 * 1.3 = 1.0192
CF_final = 1.0 sau khi clamp
```

Bệnh `dis_erysipelas` có threshold `0.85`, nên:

```text
1.0 >= 0.85
```

Hệ thống chấp nhận kết luận và trả:

```json
{
  "disease": "dis_erysipelas",
  "confidence": 100,
  "rules_triggered": ["R_Ery"]
}
```

Frontend hiển thị:

```text
Bệnh nghi ngờ: Đóng dấu son
Độ tin cậy: 100%
Phòng ngừa: Vaccine, sát trùng, giảm stress.
Điều trị: Kháng sinh theo thú y, hạ sốt và trợ sức.
Luật kích hoạt: R_Ery
```

Đây là một ví dụ đầy đủ cho thấy Hệ Chuyên gia không chỉ đưa ra kết quả, mà còn giải thích được quá trình suy luận.

## 11. Mối liên hệ với AI hình ảnh ProtoNet

Ngoài nhánh Hệ Chuyên gia, dự án còn có nhánh AI hình ảnh ProtoNet. Nhánh này xử lý ảnh da heo và dự đoán class bệnh ngoài da.

Trong `python/main.py`, class tiếng Anh của ProtoNet được map sang ID bệnh trong Knowledge Base:

```py
ENGLISH_TO_DISEASE_ID = {
    "Infected_Viral_Swinepox": "dis_swinepox",
    "Infected_Viral_Foot_and_Mouth_Disease": "dis_fmd",
    "Infected_Parasitic_Mange": "dis_sarcoptic_mange",
}
```

Sau khi nhận diện ảnh, backend lấy `disease_id` và tra phác đồ:

```py
disease_id = ENGLISH_TO_DISEASE_ID.get(english_name)
disease_detail = DISEASE_DETAILS.get(disease_id) if disease_id else None
```

Điều này giúp kết quả AI hình ảnh cũng có:

- Tên bệnh tiếng Việt.
- Đặc điểm nhận biết.
- Phòng ngừa.
- Điều trị.

Về bản chất, ProtoNet là mô hình học máy, không phải Hệ Chuyên gia. Tuy nhiên, kết quả của nó được kết nối với Knowledge Base của Hệ Chuyên gia để tạo ra phiếu kết quả y tế hoàn chỉnh.

Có thể hiểu:

```text
ProtoNet nhận diện bệnh từ ảnh.
Knowledge Base cung cấp tri thức điều trị.
Frontend hiển thị kết quả theo cùng định dạng với nhánh Prolog.
```

## 12. Vai trò của Supabase trong hệ thống

Supabase không tham gia vào quá trình suy luận Hệ Chuyên gia. Vai trò của Supabase là lưu trữ và cá nhân hóa dữ liệu người dùng.

Các bảng chính:

```text
profiles
diagnosis_history
```

Sau khi hệ thống chẩn đoán xong, kết quả được lưu vào `diagnosis_history` với:

- ID người dùng.
- Loại chẩn đoán: `EXPERT` hoặc `VISION`.
- Triệu chứng đầu vào nếu là Prolog.
- Ảnh nếu là AI hình ảnh.
- Kết quả chẩn đoán.
- Phác đồ điều trị.
- Thời gian tạo.

Nhờ Supabase, hệ thống có "trí nhớ". Chủ trang trại có thể mở dashboard để xem lại các ca bệnh cũ, kiểm tra phác đồ đã được gợi ý và theo dõi lịch sử chẩn đoán theo thời gian.

Điểm cần nhấn mạnh:

```text
Supabase là tầng lưu trữ lịch sử.
Prolog mới là tầng suy luận Hệ Chuyên gia.
```

## 13. Ưu điểm của cách triển khai Hệ Chuyên gia

### 13.1. Dễ giải thích

Hệ thống trả về danh sách luật đã kích hoạt, giúp người dùng biết kết luận đến từ đâu.

### 13.2. Dễ mở rộng tri thức

Muốn thêm bệnh mới, có thể bổ sung:

- Fact `disease(...)`.
- Các `symptom(...)` cần thiết.
- Một hoặc nhiều `rule(...)`.

Không cần huấn luyện lại mô hình như học máy.

### 13.3. Phù hợp dữ liệu không chắc chắn

Triệu chứng thực tế thường không rõ ràng tuyệt đối. Certainty Factor cho phép người dùng nhập mức độ tin cậy thay vì chỉ chọn có/không.

Ví dụ:

```text
Ho nhẹ: 0.4
Sốt cao rõ: 0.9
Không thấy mụn nước: -0.8
```

Nhờ vậy suy luận mềm dẻo hơn.

### 13.4. Kết hợp được nhiều nguồn bằng chứng

Một bệnh có thể được hỗ trợ bởi nhiều luật. Công thức MYCIN CF cho phép cộng gộp các bằng chứng cùng chiều để tăng độ tin cậy.

### 13.5. Có thể kết hợp với AI

Nhánh ProtoNet cho thấy Hệ Chuyên gia không nhất thiết đứng riêng. Nó có thể đóng vai trò tầng tri thức, cung cấp phác đồ và giải thích cho kết quả từ AI hình ảnh.

## 14. Hạn chế hiện tại

### 14.1. Chất lượng phụ thuộc vào tập luật

Nếu luật chưa đầy đủ hoặc sai, hệ thống có thể đưa ra kết luận chưa chính xác. Đây là hạn chế chung của hệ chuyên gia dựa trên luật.

### 14.2. Chưa có cơ chế học tự động

Hệ thống không tự học từ ca bệnh mới. Khi muốn cải thiện tri thức, nhóm phát triển cần cập nhật luật hoặc Knowledge Base thủ công.

### 14.3. Một số triệu chứng có thể giao nhau giữa nhiều bệnh

Ví dụ sốt cao, bỏ ăn, tiêu chảy có thể xuất hiện ở nhiều bệnh khác nhau. Vì vậy hệ thống cần nhiều luật phân biệt và threshold phù hợp.

### 14.4. Chưa thay thế bác sĩ thú y

Kết quả chỉ nên xem là hỗ trợ chẩn đoán ban đầu. Với bệnh nguy hiểm như ASF, FMD, CSF, người dùng vẫn cần liên hệ cơ quan thú y hoặc bác sĩ thú y.

## 15. Hướng phát triển

Một số hướng phát triển tiếp theo:

- Bổ sung thêm luật cho các bệnh có triệu chứng gần nhau.
- Chuẩn hóa thang CF trong giao diện để người dùng dễ trả lời hơn.
- Thêm câu hỏi phân biệt khi nhiều bệnh có CF gần nhau.
- Lưu phản hồi điều trị để đánh giá phác đồ có hiệu quả không.
- Cải thiện explainability bằng cách hiển thị triệu chứng nào làm luật kích hoạt.
- Tách Knowledge Base thành một nguồn dữ liệu duy nhất để đồng bộ Prolog, backend và frontend.
- Kết hợp kết quả Prolog và ProtoNet trong cùng một ca chẩn đoán.

## 16. Kết luận

Trong Project Pig, các kỹ thuật Hệ Chuyên gia được triển khai rõ ràng qua nhánh chẩn đoán triệu chứng bằng Prolog. Hệ thống sử dụng cơ sở tri thức gồm triệu chứng, bệnh và luật suy luận; sử dụng bộ nhớ làm việc để lưu dữ kiện người dùng; dùng động cơ suy luận để kích hoạt luật; dùng Certainty Factor để xử lý dữ liệu không chắc chắn; và trả về danh sách luật kích hoạt để giải thích kết quả.

Phần backend FastAPI đóng vai trò cầu nối giữa frontend và Prolog, còn frontend chịu trách nhiệm thu thập triệu chứng, hiển thị phiếu kết quả và giúp người dùng hiểu kết luận. Supabase bổ sung khả năng lưu lịch sử cá nhân hóa, trong khi ProtoNet mở rộng hệ thống sang nhận diện ảnh và dùng lại Knowledge Base để lấy phác đồ.

Nhờ sự kết hợp này, dự án không chỉ là một ứng dụng AI nhận diện bệnh, mà là một hệ thống hỗ trợ quyết định có khả năng suy luận, giải thích và lưu trữ lịch sử theo từng chủ trang trại.
