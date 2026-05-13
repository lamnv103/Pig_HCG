import { createClient } from '@supabase/supabase-js'

// Lấy biến môi trường từ file .env bạn đã tạo ở bước trước
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Khởi tạo client để toàn bộ app có thể dùng chung
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
