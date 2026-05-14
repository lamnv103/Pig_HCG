# Tài liệu cập nhật: Hoàn thiện các phần còn thiếu của Hệ Chuyên gia

## 1. Mục tiêu của bản cập nhật

Bản cập nhật này tập trung hoàn thiện các điểm còn thiếu so với mô tả ban đầu của đề tài:

- Suy diễn lùi đúng nghĩa hơn.
- Hỏi đáp động dựa trên backend/Prolog thay vì chỉ heuristic ở frontend.
- Giải thích kết luận chi tiết hơn.
- Bổ sung điểm phân tích Fuzzy/Bayes ở mức tham khảo.
- Thêm trang quản trị tri thức để xem và tạo luật bản nháp.

IoT được bỏ qua theo yêu cầu, vì đây là hướng mở rộng không cần thiết cho phiên bản hiện tại.

Các file chính đã thay đổi:

```text
prolog/rules.pl
python/main.py
frontend/src/api.js
frontend/src/components/DynamicInterview.jsx
frontend/src/components/DiagnosisResult.jsx
frontend/src/pages/KnowledgeAdminPage.jsx
frontend/src/App.jsx
frontend/src/components/layout/Sidebar.jsx
frontend/src/components/layout/BottomNav.jsx
frontend/src/services/diagnosisHistory.js
```

## 2. Vấn đề trước khi cập nhật

Trước bản cập nhật này, hệ thống đã có các phần quan trọng:

- Chẩn đoán theo triệu chứng.
- Luật IF-THEN trong Prolog.
- Certainty Factor.
- Xếp hạng bệnh.
- Lưu lịch sử Supabase.
- Phác đồ điều trị.
- Hỏi đáp động ở frontend.

Tuy nhiên, vẫn còn một số điểm chưa khớp hoàn toàn với mô tả ban đầu:

| Hạng mục | Trước cập nhật | Vấn đề |
|---|---|---|
| Suy diễn lùi | Chủ yếu quét luật và tính CF | Chưa có cơ chế backend chọn câu hỏi từ giả thuyết bệnh |
| Hỏi đáp động | Heuristic trong frontend | Chưa dựa trực tiếp vào Prolog |
| Explainability | Chỉ có `rules_triggered` | Chưa giải thích CF/Fuzzy/Bayes và triệu chứng trong luật |
| Fuzzy/Bayes | Chưa có | Thiếu phần xử lý không chắc chắn mở rộng |
| Quản trị tri thức | Chưa có UI | Muốn xem/sửa luật phải đọc file thủ công |

Bản cập nhật này giải quyết các điểm trên theo hướng thực dụng, an toàn cho demo và không phá vỡ luồng chẩn đoán cũ.

## 3. Cập nhật 1: Suy diễn lùi đúng nghĩa hơn trong Prolog

File thay đổi:

```text
prolog/rules.pl
```

### 3.1. Mục tiêu

Mô tả ban đầu của đề tài nói rằng hệ thống nên:

```text
Bắt đầu từ giả thuyết bệnh,
kiểm tra các tiền đề của luật,
nếu thiếu tiền đề thì sinh câu hỏi phụ cho người dùng.
```

Trước đây, frontend tự quét danh sách luật trong `knowledge.js` để chọn câu hỏi tiếp theo. Cách này vẫn tạo được hỏi đáp động, nhưng chưa thể gọi là suy diễn lùi từ lõi chuyên gia.

Bản cập nhật đưa logic chọn câu hỏi về Prolog bằng predicate mới:

```prolog
backward_next_question(SymptomId, Disease, RuleId, Score).
```

### 3.2. Mở rộng dynamic predicate

Trước đây:

```prolog
:- dynamic known/2.
```

Sau cập nhật:

```prolog
:- dynamic known/2, symptom/2, disease/9, rule/5.
```

Ý nghĩa:

- `known/2`: dữ kiện người dùng cung cấp trong phiên chẩn đoán.
- `symptom/2`: danh mục triệu chứng.
- `disease/9`: danh mục bệnh.
- `rule/5`: tập luật suy luận.

Việc khai báo thêm `symptom/2`, `disease/9`, `rule/5` là bước chuẩn bị cho hướng quản trị tri thức runtime hoặc reload tri thức trong tương lai.

### 3.3. Các predicate hỗ trợ

Thêm các predicate:

```prolog
unknown_symptom(S) :- \+ known(S, _).
positive_symptom(S) :- known(S, CF), CF > 0.0.
negative_symptom(S) :- known(S, CF), CF < -0.2.
```

Ý nghĩa:

- `unknown_symptom(S)`: triệu chứng chưa được hỏi hoặc chưa có dữ kiện.
- `positive_symptom(S)`: người dùng xác nhận triệu chứng có xuất hiện.
- `negative_symptom(S)`: người dùng phủ định triệu chứng với mức đủ mạnh.

Ngưỡng `-0.2` dùng để coi một triệu chứng là bằng chứng phủ định. Nếu người dùng chỉ hơi không chắc, hệ thống không loại luật quá sớm.

### 3.4. Đếm triệu chứng đã khớp và còn thiếu

Thêm:

```prolog
count_positive(Symptoms, Count).
count_unknown(Symptoms, Count).
has_negative(Symptoms).
```

Các predicate này giúp hệ thống đánh giá một luật:

- Luật đã khớp bao nhiêu tiền đề?
- Luật còn thiếu bao nhiêu tiền đề?
- Luật có bị phủ định bởi triệu chứng nào không?

Ví dụ với luật:

```prolog
rule('R_Ery', [sym_sot_rat_cao, sym_ban_hinh_vuong_thoi], dis_erysipelas, 0.98, 3).
```

Nếu người dùng đã trả lời:

```prolog
known(sym_sot_rat_cao, 1.0).
```

thì:

```text
positive_count = 1
unknown_count = 1
missing_symptom = sym_ban_hinh_vuong_thoi
```

Từ đó Prolog có thể hỏi tiếp:

```text
Trên da có các đốm đỏ/tím hình vuông, hình thoi không?
```

### 3.5. Sinh câu hỏi từ giả thuyết bệnh

Predicate chính:

```prolog
backward_question_candidate(Disease, RuleId, MissingSymptom, Score) :-
    rule(RuleId, Symptoms, Disease, RuleCF, Priority),
    \+ has_negative(Symptoms),
    member(MissingSymptom, Symptoms),
    unknown_symptom(MissingSymptom),
    count_positive(Symptoms, PositiveCount),
    PositiveCount > 0,
    count_unknown(Symptoms, UnknownCount),
    length(Symptoms, TotalCount),
    TotalCount > 0,
    priority_weight(Priority, PriorityWeight),
    CompletionScore is PositiveCount / TotalCount,
    RuleStrength is RuleCF * PriorityWeight,
    NeedScore is 1.0 / (UnknownCount + 1),
    Score is CompletionScore + RuleStrength + NeedScore.
```

Logic:

1. Duyệt qua từng luật `rule(...)`.
2. Bỏ qua luật nếu có triệu chứng bị phủ định mạnh.
3. Tìm triệu chứng còn thiếu trong luật.
4. Chỉ xét luật đã có ít nhất một triệu chứng dương.
5. Tính điểm ưu tiên cho câu hỏi.

Điểm `Score` gồm:

- `CompletionScore`: luật đã hoàn thành được bao nhiêu phần.
- `RuleStrength`: luật mạnh đến đâu dựa trên CF và priority.
- `NeedScore`: luật càng ít tiền đề còn thiếu thì càng nên hỏi.

Nhờ vậy, hệ thống ưu tiên hỏi câu có khả năng làm rõ giả thuyết nhanh nhất.

### 3.6. Chọn câu hỏi tốt nhất

Predicate:

```prolog
backward_next_question(SymptomId, Disease, RuleId, Score) :-
    findall(NegScore-S-D-R,
            (backward_question_candidate(D, R, S, CandidateScore),
             NegScore is -CandidateScore),
            Candidates),
    Candidates \= [],
    keysort(Candidates, SortedCandidates),
    SortedCandidates = [BestNegScore-SymptomId-Disease-RuleId|_],
    Score is -BestNegScore.
```

Vì `keysort` sắp xếp tăng dần, hệ thống dùng `NegScore` để biến điểm cao thành giá trị nhỏ hơn. Câu hỏi có điểm cao nhất sẽ đứng đầu.

Kết quả trả ra gồm:

- `SymptomId`: triệu chứng cần hỏi tiếp.
- `Disease`: bệnh giả thuyết đang được kiểm tra.
- `RuleId`: luật sinh ra câu hỏi.
- `Score`: điểm ưu tiên của câu hỏi.

## 4. Cập nhật 2: API backend cho suy diễn lùi

File thay đổi:

```text
python/main.py
```

### 4.1. Endpoint mới `/api/next-question`

Thêm endpoint:

```http
POST /api/next-question
```

Payload:

```json
{
  "symptoms": {
    "sym_sot_rat_cao": 1.0
  }
}
```

Backend thực hiện:

1. Xóa working memory cũ trong Prolog.
2. Nạp triệu chứng hiện tại bằng `known(...)`.
3. Gọi:

```prolog
backward_next_question(SymptomId, Disease, RuleId, Score)
```

4. Tìm nội dung câu hỏi từ `symptom(SymptomId, Question)`.
5. Trả JSON về frontend.

Response nếu còn câu hỏi:

```json
{
  "status": "question",
  "question": {
    "id": "sym_ban_hinh_vuong_thoi",
    "question": "Trên da ... có các đốm đỏ/tím hình vuông, hình thoi không?",
    "target_disease": "dis_erysipelas",
    "source_rule": "R_Ery",
    "score": 2.57,
    "strategy": "backward_chaining"
  }
}
```

Response nếu không còn câu hỏi tốt:

```json
{
  "status": "done",
  "question": null,
  "reason": "Không còn tiền đề thiếu có giá trị suy luận lùi."
}
```

### 4.2. Hàm nạp working memory dùng chung

Thêm hàm:

```py
def load_symptoms_into_prolog(symptoms):
    list(prolog.query("retractall(known(_, _))"))
    ...
    prolog.assertz(f"known({sym}, {clean_cf})")
```

Trước đây logic nạp triệu chứng nằm trực tiếp trong `/api/diagnose`. Bây giờ được tách thành hàm dùng chung cho:

- `/api/diagnose`
- `/api/next-question`

Điều này giúp hai endpoint dùng cùng một cách hiểu dữ liệu triệu chứng.

### 4.3. Hàm flatten symptoms

Thêm:

```py
def flatten_symptoms(symptoms):
    ...
```

Hàm này xử lý cả trường hợp payload phẳng:

```json
{
  "sym_sot_rat_cao": 1.0
}
```

và payload lồng:

```json
{
  "group": {
    "sym_sot_rat_cao": 1.0
  }
}
```

Kết quả cuối cùng là dictionary phẳng để nạp vào Prolog.

## 5. Cập nhật 3: Fuzzy/Bayes bổ trợ cho giải thích

File thay đổi:

```text
python/main.py
```

### 5.1. Mục tiêu

Hệ thống vẫn dùng Certainty Factor làm điểm chính. Fuzzy/Bayes được thêm ở vai trò phân tích tham khảo, giúp báo cáo và giao diện thể hiện rõ hơn phần xử lý không chắc chắn.

Điểm quan trọng:

```text
CF là cơ chế chính để xếp hạng bệnh.
Fuzzy/Bayes là lớp giải thích bổ sung, không thay thế CF.
```

### 5.2. Fuzzy label

Thêm hàm:

```py
def fuzzy_label(cf):
    if cf >= 0.85:
        return "rất mạnh"
    if cf >= 0.6:
        return "mạnh"
    if cf >= 0.3:
        return "trung bình"
    if cf > 0:
        return "yếu"
    if cf == 0:
        return "không rõ"
    return "phủ định"
```

Hàm này biến giá trị CF số thành nhãn ngôn ngữ dễ hiểu hơn.

Ví dụ:

| CF | Fuzzy label |
|---:|---|
| 0.95 | rất mạnh |
| 0.7 | mạnh |
| 0.45 | trung bình |
| 0.1 | yếu |
| 0 | không rõ |
| -0.8 | phủ định |

### 5.3. Lấy chi tiết luật

Thêm:

```py
def get_rule_detail(rule_id):
    query = f"rule('{safe_rule_id}', Symptoms, Disease, CF, Priority)"
```

Hàm này lấy lại:

- Mã luật.
- Danh sách triệu chứng trong luật.
- Bệnh kết luận.
- CF cơ sở.
- Priority.

Thông tin này dùng để xây dựng phần giải thích chi tiết.

### 5.4. Báo cáo uncertainty

Thêm:

```py
def build_uncertainty_report(disease_id, cf_score, rules_fired, user_symptoms):
```

Hàm này tạo object:

```json
{
  "disease_id": "dis_erysipelas",
  "cf_score": 100,
  "fuzzy_score": 80,
  "bayes_score": 78.4,
  "note": "CF là điểm chính...",
  "evidence": [
    {
      "rule_id": "R_Ery",
      "base_cf": 0.98,
      "priority": 3,
      "fuzzy_match": 80,
      "symptoms": [
        {
          "id": "sym_sot_rat_cao",
          "cf": 1,
          "fuzzy_label": "rất mạnh"
        }
      ]
    }
  ]
}
```

### 5.5. Cách tính fuzzy score

Với từng luật, hệ thống lấy CF dương của các triệu chứng trong luật và dùng giá trị nhỏ nhất:

```text
fuzzy_match = min(CF của các triệu chứng trong luật)
```

Đây là cách phổ biến để mô phỏng toán tử AND trong fuzzy logic:

```text
Một luật chỉ khớp mạnh khi tất cả tiền đề đều khớp tương đối mạnh.
```

Ví dụ:

```text
sym_sot_rat_cao = 1.0
sym_ban_hinh_vuong_thoi = 0.8
```

Khi đó:

```text
fuzzy_match = min(1.0, 0.8) = 0.8 = 80%
```

### 5.6. Cách tính Bayes score tham khảo

Bayes score trong bản cập nhật này là điểm tham khảo đơn giản, không phải mô hình Bayes đầy đủ có prior/likelihood được huấn luyện từ dữ liệu thực.

Với mỗi luật, backend tính:

```text
weighted_likelihood = rule_cf * fuzzy_score
```

Sau đó gộp nhiều bằng chứng theo dạng complement:

```text
bayes_score = 1 - tích(1 - weighted_likelihood_i)
```

Ý nghĩa:

- Một bằng chứng mạnh làm Bayes score tăng.
- Nhiều bằng chứng cùng ủng hộ làm Bayes score tăng thêm.
- Điểm này chỉ dùng để giải thích thêm, không dùng để thay thế CF ranking.

## 6. Cập nhật 4: Kết quả chẩn đoán trả thêm `uncertainty`

File thay đổi:

```text
python/main.py
```

Trong endpoint:

```http
POST /api/diagnose
```

Trước đây mỗi kết quả có:

```json
{
  "disease": "dis_erysipelas",
  "confidence": 100,
  "rules_triggered": ["R_Ery"]
}
```

Sau cập nhật, mỗi kết quả có thêm:

```json
{
  "disease": "dis_erysipelas",
  "confidence": 100,
  "rules_triggered": ["R_Ery"],
  "uncertainty": {
    "cf_score": 100,
    "fuzzy_score": 80,
    "bayes_score": 78.4,
    "evidence": []
  }
}
```

Nhờ vậy frontend có đủ dữ liệu để giải thích sâu hơn.

## 7. Cập nhật 5: Frontend hỏi câu tiếp theo từ backend

Các file thay đổi:

```text
frontend/src/api.js
frontend/src/components/DynamicInterview.jsx
```

### 7.1. API client mới

Trong `frontend/src/api.js`, thêm:

```js
export async function getNextQuestion(symptomsDict) {
  const response = await api.post('/api/next-question', { symptoms: symptomsDict })
  return response.data
}
```

### 7.2. DynamicInterview dùng backend Prolog

Trong `DynamicInterview.jsx`, trước đây câu hỏi tiếp theo được chọn bằng heuristic nội bộ:

```text
quét rules trong frontend
tìm luật đang nóng
hỏi triệu chứng còn thiếu
```

Sau cập nhật, component gọi:

```js
const payload = await getNextQuestion(allKnown);
setBackendQuestion(payload?.question || null);
```

Sau đó:

```js
const currentQuestion = backendQuestion || heuristicQuestion;
```

Ý nghĩa:

- Nếu backend Prolog trả câu hỏi, frontend dùng câu hỏi đó.
- Nếu backend chưa chạy hoặc lỗi, frontend fallback về heuristic cũ.

Nhờ vậy hệ thống vẫn ổn định khi demo, nhưng ưu tiên logic suy diễn lùi từ backend.

### 7.3. Hiển thị nguồn câu hỏi

Thanh tiến trình giờ hiển thị:

```text
Suy diễn lùi · Câu 1
```

nếu câu hỏi đến từ backend.

Nếu fallback:

```text
Heuristic · Câu 1
```

Nếu backend trả `source_rule`, UI hiển thị:

```text
Luật gợi ý: R_Ery
```

Điều này giúp người dùng và người chấm thấy rõ câu hỏi được sinh từ luật nào.

## 8. Cập nhật 6: Giải thích sâu trong màn hình kết quả

File thay đổi:

```text
frontend/src/components/DiagnosisResult.jsx
```

### 8.1. Trước cập nhật

Khi mở phần giải thích, frontend chỉ hiển thị danh sách rule:

```text
R_Ery
```

### 8.2. Sau cập nhật

Frontend hiển thị thêm:

- CF score.
- Fuzzy score.
- Bayes score.
- Ghi chú rằng CF là điểm chính.
- Danh sách evidence theo luật.
- Triệu chứng trong từng luật.
- CF và fuzzy label của từng triệu chứng.

Ví dụ hiển thị:

```text
Phân tích không chắc chắn
CF: 100%
Fuzzy: 80%
Bayes: 78.4%

R_Ery
Base CF 0.98 · Priority 3 · Fuzzy 80%
sym_sot_rat_cao: 1.0 (rất mạnh)
sym_ban_hinh_vuong_thoi: 0.8 (mạnh)
```

Nhờ vậy explainability không chỉ là “luật nào kích hoạt”, mà còn giải thích mức độ đóng góp của từng triệu chứng.

## 9. Cập nhật 7: Lưu uncertainty vào Supabase history

File thay đổi:

```text
frontend/src/services/diagnosisHistory.js
```

Trong hàm chuẩn hóa kết quả Prolog:

```js
function normalizeExpertResult(result) {
  ...
  uncertainty: result?.uncertainty || null,
}
```

Ý nghĩa:

- Khi lưu lịch sử chẩn đoán `EXPERT`, phần `uncertainty` cũng được lưu vào `diagnosis_results`.
- Sau này dashboard có thể mở lại ca cũ và vẫn có đủ dữ liệu giải thích.

## 10. Cập nhật 8: API Knowledge Base

File thay đổi:

```text
python/main.py
frontend/src/api.js
```

### 10.1. Backend endpoint `/api/knowledge`

Thêm endpoint:

```http
GET /api/knowledge
```

Response:

```json
{
  "status": "success",
  "metadata": {},
  "symptoms": [],
  "diseases": [],
  "rules": []
}
```

Backend lấy:

- `metadata`, `symptoms`, `diseases` từ JSON Knowledge Base.
- `rules` trực tiếp từ Prolog bằng query:

```prolog
rule(RuleId, Symptoms, Disease, CF, Priority)
```

### 10.2. Frontend API client

Trong `frontend/src/api.js`, thêm:

```js
export async function getKnowledgeBase() {
  const response = await api.get('/api/knowledge')
  return response.data
}
```

API này được dùng bởi trang quản trị tri thức.

## 11. Cập nhật 9: Trang quản trị tri thức

File mới:

```text
frontend/src/pages/KnowledgeAdminPage.jsx
```

### 11.1. Mục tiêu

Trang quản trị tri thức giúp nhóm:

- Xem toàn bộ triệu chứng.
- Xem toàn bộ bệnh.
- Xem toàn bộ luật IF-THEN.
- Tìm kiếm luật/bệnh/triệu chứng.
- Tạo luật bản nháp.
- Export JSON luật bản nháp để duyệt và đồng bộ vào Prolog.

Trang này chưa ghi trực tiếp vào `rules.pl`. Đây là chủ ý thiết kế an toàn:

```text
Tri thức thú y nên được duyệt trước khi đưa vào lõi suy luận.
```

Nếu cho UI ghi thẳng vào Prolog, người dùng có thể tạo luật sai và làm kết quả chẩn đoán thiếu tin cậy.

### 11.2. Dữ liệu tải vào trang admin

Trang gọi:

```js
getKnowledgeBase()
```

Nếu backend chạy, trang lấy dữ liệu thật từ backend.

Nếu backend không chạy, trang fallback sang:

```js
symptomCatalog
diseaseCatalog
fallbackRules
```

từ `frontend/src/data/knowledge.js`.

### 11.3. Ba tab chính

Trang có ba tab:

```text
Luật
Bệnh
Triệu chứng
```

Tab `Luật` hiển thị:

- Mã luật.
- CF.
- Priority.
- Bệnh kết luận.
- Danh sách triệu chứng tiền đề.
- Nhãn `Bản nháp` nếu là luật tạo trong admin.

Tab `Bệnh` hiển thị:

- ID bệnh.
- Tên bệnh.
- Nhóm bệnh.
- Threshold.
- Dấu hiệu điển hình.

Tab `Triệu chứng` hiển thị:

- ID triệu chứng.
- Nội dung câu hỏi.

### 11.4. Tạo luật bản nháp

Form tạo luật gồm:

```text
rule_id
if_symptoms
then_disease
cf
priority
```

Ví dụ nhập:

```text
rule_id: R_CUSTOM_01
if_symptoms: sym_sot_rat_cao, sym_xuat_huyet_da
then_disease: dis_asf
cf: 0.85
priority: 3
```

Trang sẽ lưu vào localStorage:

```text
pig_knowledge_admin_draft_rules
```

### 11.5. Export luật bản nháp

Trang hiển thị JSON:

```json
{
  "draft_rules": [
    {
      "rule_id": "R_CUSTOM_01",
      "if": ["sym_sot_rat_cao", "sym_xuat_huyet_da"],
      "then": "dis_asf",
      "cf": 0.85,
      "priority": 3
    }
  ]
}
```

Nhóm phát triển có thể copy JSON này, kiểm tra lại, rồi chuyển thành luật Prolog chính thức.

## 12. Cập nhật 10: Menu điều hướng

Các file thay đổi:

```text
frontend/src/App.jsx
frontend/src/components/layout/Sidebar.jsx
frontend/src/components/layout/BottomNav.jsx
```

### 12.1. Thêm page `admin`

Trong `App.jsx`, thêm:

```js
import KnowledgeAdminPage from './pages/KnowledgeAdminPage'
```

và route nội bộ:

```js
case 'admin':
  return <KnowledgeAdminPage />
```

### 12.2. Thêm menu Tri Thức

Trong sidebar:

```js
{ id: 'admin', label: 'Tri Thức', icon: '🧠', desc: 'Quản trị luật & bệnh' }
```

Trong bottom nav:

```js
{ id: 'admin', label: 'Tri Thức', icon: '🧠' }
```

Người dùng có thể mở trang quản trị tri thức từ desktop và mobile.

## 13. Luồng hoạt động mới sau cập nhật

### 13.1. Luồng hỏi đáp bằng suy diễn lùi

```text
Người dùng chọn triệu chứng ban đầu
  ↓
Frontend gom allKnown
  ↓
POST /api/next-question
  ↓
Backend nạp known(...) vào Prolog
  ↓
Prolog xét các luật đang khớp một phần
  ↓
Prolog chọn triệu chứng còn thiếu có Score cao nhất
  ↓
Backend trả câu hỏi + rule nguồn
  ↓
Frontend hỏi người dùng
  ↓
Lặp lại đến khi đủ dữ kiện hoặc đạt giới hạn câu hỏi
```

### 13.2. Luồng chẩn đoán cuối

```text
Frontend gửi tất cả triệu chứng
  ↓
POST /api/diagnose
  ↓
Backend nạp known(...) vào Prolog
  ↓
Prolog tính CF và xếp hạng bệnh
  ↓
Backend bổ sung uncertainty report
  ↓
Frontend hiển thị kết quả + giải thích sâu
  ↓
Supabase lưu lịch sử gồm cả uncertainty
```

## 14. Ví dụ minh họa sau cập nhật

### 14.1. Người dùng nhập triệu chứng ban đầu

```json
{
  "symptoms": {
    "sym_sot_rat_cao": 1.0
  }
}
```

### 14.2. Backend hỏi câu tiếp theo

Prolog xét luật:

```prolog
rule('R_Ery', [sym_sot_rat_cao, sym_ban_hinh_vuong_thoi], dis_erysipelas, 0.98, 3).
```

Luật này:

- Có `sym_sot_rat_cao` đã khớp.
- Còn thiếu `sym_ban_hinh_vuong_thoi`.
- Có CF cao `0.98`.
- Có priority mạnh `3`.

Vì vậy `/api/next-question` có thể trả:

```json
{
  "status": "question",
  "question": {
    "id": "sym_ban_hinh_vuong_thoi",
    "target_disease": "dis_erysipelas",
    "source_rule": "R_Ery",
    "strategy": "backward_chaining"
  }
}
```

### 14.3. Người dùng trả lời câu hỏi

```json
{
  "sym_sot_rat_cao": 1.0,
  "sym_ban_hinh_vuong_thoi": 0.8
}
```

### 14.4. Chẩn đoán cuối

Backend trả:

```json
{
  "disease": "dis_erysipelas",
  "confidence": 100,
  "rules_triggered": ["R_Ery"],
  "uncertainty": {
    "cf_score": 100,
    "fuzzy_score": 80,
    "bayes_score": 78.4
  }
}
```

Frontend hiển thị:

```text
Bệnh: Đóng dấu son
Độ tin cậy: 100%
Luật kích hoạt: R_Ery
CF: 100%
Fuzzy: 80%
Bayes: 78.4%
```

## 15. Giới hạn hiện tại

### 15.1. Suy diễn lùi là dạng thực dụng, chưa phải engine hội thoại đầy đủ

Hệ thống đã đưa logic chọn câu hỏi về Prolog và chọn tiền đề còn thiếu từ luật. Tuy nhiên, đây chưa phải một engine backward chaining hội thoại hoàn chỉnh kiểu:

```text
goal stack
subgoal tree
proof trace đầy đủ
```

Nó là phiên bản thực dụng phù hợp demo:

- Dựa trên luật đang khớp một phần.
- Chọn tiền đề còn thiếu.
- Ưu tiên luật mạnh và gần hoàn thành.

### 15.2. Bayes chưa phải Bayesian model huấn luyện từ dữ liệu thật

Bayes score hiện là điểm tham khảo dựa trên rule CF và fuzzy match. Muốn Bayes đúng nghĩa hơn cần:

- prior probability của từng bệnh.
- likelihood P(symptom | disease).
- dữ liệu ca bệnh thực tế để ước lượng xác suất.

### 15.3. Trang quản trị chưa ghi thẳng vào Prolog

Trang admin hiện tạo luật bản nháp trong localStorage và export JSON. Đây là lựa chọn an toàn cho phiên bản demo.

Muốn admin chỉnh sửa thật cần thêm:

- API ghi luật.
- Cơ chế validate luật.
- Cơ chế reload Prolog.
- Phân quyền admin.
- Lịch sử thay đổi tri thức.

## 16. Kiểm thử đã chạy

Đã chạy các kiểm tra:

```bash
npm run lint
npm run build
python -m py_compile python/main.py
swipl -q -t halt -s prolog/rules.pl
```

Kết quả:

- Frontend lint pass.
- Frontend build pass.
- Python compile pass.
- Prolog load pass.
- Frontend dev server trả HTTP 200 tại `http://127.0.0.1:5173`.

Build còn cảnh báo chunk lớn hơn 500KB. Đây là cảnh báo tối ưu bundle, không phải lỗi chức năng.

## 17. Kết luận

Sau bản cập nhật này, hệ thống đã hoàn thiện rõ hơn các điểm từng bị thiếu:

- Có suy diễn lùi backend/Prolog để chọn câu hỏi.
- Hỏi đáp động không còn chỉ phụ thuộc heuristic frontend.
- Kết quả có giải thích sâu hơn với CF, Fuzzy, Bayes và evidence theo luật.
- Có API Knowledge Base để phục vụ quản trị tri thức.
- Có trang admin xem và tạo luật bản nháp.

Hệ thống hiện phù hợp hơn với mô tả ban đầu của đề tài Hệ Chuyên gia: có cơ sở tri thức, bộ nhớ làm việc, suy diễn lùi, xử lý không chắc chắn, giải thích kết luận, lưu lịch sử và giao diện quản trị tri thức ở mức demo an toàn.
