import { supabase } from '../supabaseClient'
import { diseaseById } from '../data/knowledge'

const IMAGE_BUCKET = 'diagnosis-images'

function getSafeRandomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeConfidence(value) {
  const numberValue = Number(value)
  if (Number.isNaN(numberValue)) return 0
  return Math.max(0, Math.min(100, Math.round(numberValue * 100) / 100))
}

function normalizeExpertResult(result) {
  const diseaseId = result?.id || result?.disease
  const detail = diseaseById[diseaseId]

  return {
    disease_id: diseaseId || null,
    disease: detail?.name || result?.disease || 'Không xác định',
    confidence: normalizeConfidence(result?.confidence),
    hallmark: result?.hallmark || detail?.hallmark || null,
    prevention: result?.prevention || detail?.prevention || null,
    treatment: result?.treatment || detail?.treatment || null,
    cause: result?.cause || detail?.cause || null,
    rules_triggered: result?.rules_triggered || [],
  }
}

function normalizeVisionResult(result) {
  const detail = result?.disease_detail || diseaseById[result?.disease_id]

  return {
    disease_id: result?.disease_id || null,
    disease: result?.predicted_class || detail?.name || 'Không xác định',
    english_name: result?.english_name || null,
    confidence: normalizeConfidence(result?.confidence),
    hallmark: detail?.hallmark || null,
    prevention: detail?.prevention || null,
    treatment: detail?.treatment || null,
    cause: detail?.cause || null,
    top_predictions: result?.top_predictions || [],
  }
}

async function uploadDiagnosisImage(userId, file) {
  if (!userId || !file) return null

  const extension = file.name?.split('.').pop() || 'jpg'
  const path = `${userId}/${Date.now()}-${getSafeRandomId()}.${extension}`

  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })

  if (error) {
    console.warn(`Không thể upload ảnh lên bucket ${IMAGE_BUCKET}:`, error.message)
    return null
  }

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path)
  return data?.publicUrl || null
}

async function ensureProfileExists(userId) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id' })

  if (error) throw error
}

export async function fetchUserProfile(userId) {
  if (!userId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('farm_name, location, scale, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function fetchDiagnosisHistory(userId, limit = 20) {
  if (!userId) return []

  const { data, error } = await supabase
    .from('diagnosis_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function fetchMonthlyDiagnosisCount(userId, date = new Date()) {
  if (!userId) return 0

  const start = new Date(date.getFullYear(), date.getMonth(), 1).toISOString()
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1).toISOString()

  const { count, error } = await supabase
    .from('diagnosis_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', start)
    .lt('created_at', end)

  if (error) throw error
  return count || 0
}

export async function saveExpertDiagnosis({ userId, symptomsInput, results }) {
  if (!userId) throw new Error('Thiếu user_id khi lưu lịch sử chẩn đoán.')
  await ensureProfileExists(userId)

  const normalizedResults = Array.isArray(results) ? results.map(normalizeExpertResult) : []
  const topResult = normalizedResults[0] || null

  const diagnosisResults = {
    source: 'Hệ chuyên gia Prolog',
    top_disease: topResult?.disease || 'Không tìm thấy bệnh phù hợp',
    top_confidence: topResult?.confidence || 0,
    results: normalizedResults,
  }

  const { data, error } = await supabase
    .from('diagnosis_history')
    .insert({
      user_id: userId,
      type: 'EXPERT',
      image_url: null,
      symptoms_input: symptomsInput || {},
      diagnosis_results: diagnosisResults,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function saveVisionDiagnosis({ userId, file, result }) {
  if (!userId) throw new Error('Thiếu user_id khi lưu lịch sử chẩn đoán.')
  await ensureProfileExists(userId)

  const imageUrl = await uploadDiagnosisImage(userId, file)
  const normalizedResult = normalizeVisionResult(result)

  const diagnosisResults = {
    source: 'AI ProtoNet',
    top_disease: normalizedResult.disease,
    top_confidence: normalizedResult.confidence,
    english_name: normalizedResult.english_name,
    disease_id: normalizedResult.disease_id,
    disease_detail: {
      hallmark: normalizedResult.hallmark,
      prevention: normalizedResult.prevention,
      treatment: normalizedResult.treatment,
      cause: normalizedResult.cause,
    },
    top_predictions: normalizedResult.top_predictions,
    image_file: file
      ? {
          name: file.name,
          type: file.type,
          size: file.size,
        }
      : null,
    results: [normalizedResult],
  }

  const { data, error } = await supabase
    .from('diagnosis_history')
    .insert({
      user_id: userId,
      type: 'VISION',
      image_url: imageUrl,
      symptoms_input: null,
      diagnosis_results: diagnosisResults,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteDiagnosisHistory(userId) {
  if (!userId) return

  const { error } = await supabase
    .from('diagnosis_history')
    .delete()
    .eq('user_id', userId)

  if (error) throw error
}
