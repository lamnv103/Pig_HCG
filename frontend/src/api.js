import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Tăng timeout lên 30s để model AI có đủ thời gian phân tích ảnh
})

// 1. API GỌI MÔ HÌNH NHẬN DIỆN HÌNH ẢNH (PROTONET)
export const predictImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/api/predict', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// 2. API GỌI HỆ CHUYÊN GIA SUY DIỄN (PROLOG)
export async function diagnose(symptomsDict) {
  // Gói gọn data đúng chuẩn mà FastAPI pydantic model (SymptomsInput) đang chờ: { symptoms: {...} }
  const response = await api.post('/api/diagnose', { symptoms: symptomsDict })
  return response.data
}

export async function getNextQuestion(symptomsDict) {
  const response = await api.post('/api/next-question', { symptoms: symptomsDict })
  return response.data
}

export async function getKnowledgeBase() {
  const response = await api.get('/api/knowledge')
  return response.data
}
