import { useState } from 'react'
import { diagnose } from './api'

// Tạm thời import các component mới (chúng ta sẽ tạo chúng ở bước sau)
import WelcomeScreen from './components/WelcomeScreen'
import InitialSymptomSelector from './components/InitialSymptomSelector'
import DynamicInterview from './components/DynamicInterview'
import DiagnosisResult from './components/DiagnosisResult'

function parseErrorMessage(error) {
  if (error?.response?.data?.detail) return String(error.response.data.detail)
  if (error?.message) return String(error.message)
  return 'Không thể kết nối API chẩn đoán.'
}

export default function App() {
  // 1. Quản lý trạng thái luồng (State Machine)
  const [currentStep, setCurrentStep] = useState('WELCOME') // 'WELCOME', 'INITIAL', 'INTERVIEW', 'RESULT'
  
  // 2. Bộ nhớ lưu trữ triệu chứng (Working Memory của Frontend)
  const [knownSymptoms, setKnownSymptoms] = useState({})
  
  // 3. Quản lý API và kết quả
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState([])
  const [errorMessage, setErrorMessage] = useState('')

  // --- CÁC HÀM ĐIỀU PHỐI LUỒNG ---

  // Bắt đầu ca khám mới
  const handleStart = () => {
    setKnownSymptoms({})
    setResults([])
    setErrorMessage('')
    setCurrentStep('INITIAL')
  }

  // Nhận dữ liệu từ màn hình chọn triệu chứng ban đầu
  const handleInitialSubmit = (initialData) => {
    // initialData là một object chứa các triệu chứng nổi bật, vd: { "sym_sot_rat_cao": 1.0, "sym_bo_an": 0.8 }
    setKnownSymptoms({ ...knownSymptoms, ...initialData })
    setCurrentStep('INTERVIEW') // Chuyển sang vòng lặp hỏi đáp
  }

  // Nhận dữ liệu cuối cùng từ màn hình hỏi đáp và gọi API
  const handleInterviewComplete = async (finalData) => {
    const allSymptoms = { ...knownSymptoms, ...finalData }
    setKnownSymptoms(allSymptoms)
    
    setIsLoading(true)
    setErrorMessage('')
    setCurrentStep('RESULT') // Chuyển sang màn hình chờ/kết quả

    try {
      const payload = await diagnose(allSymptoms)
      setResults(payload?.data || [])
    } catch (error) {
      setResults([])
      setErrorMessage(parseErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  // RENDER THEO TỪNG BƯỚC
  return (
    <main className="page-shell mx-auto min-h-screen w-full max-w-3xl px-4 py-8 md:px-6 md:py-10">
      {/* Giữ lại header đẹp của bạn, nhưng điều chỉnh padding/margin cho gọn */}
      <header className="mb-6 rounded-3xl border border-moss/20 bg-white/70 p-6 shadow-panel backdrop-blur text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-moss">Pig Diagnostic Expert System</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink md:text-4xl">Trợ Lý Chẩn Đoán Thú Y</h1>
      </header>

      {errorMessage && (
        <section className="mb-6 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 text-center animate-fade-in">
          Lỗi: {errorMessage}
          <button onClick={handleStart} className="ml-4 font-bold underline">Thử lại</button>
        </section>
      )}

      {/* Vùng Render Component động */}
      <div className="relative w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-8 min-h-[400px]">
        {currentStep === 'WELCOME' && (
          <WelcomeScreen onStart={handleStart} />
        )}

        {currentStep === 'INITIAL' && (
          <InitialSymptomSelector onSubmit={handleInitialSubmit} />
        )}

        {currentStep === 'INTERVIEW' && (
          <DynamicInterview 
            currentKnown={knownSymptoms} 
            onComplete={handleInterviewComplete} 
          />
        )}

        {currentStep === 'RESULT' && (
          <DiagnosisResult 
            results={results} 
            isLoading={isLoading} 
            onRestart={handleStart} 
          />
        )}
      </div>
    </main>
  )
}