import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

export async function diagnose(symptoms) {
  const response = await api.post('/api/diagnose', { symptoms })
  return response.data
}

