import { useEffect, useState } from 'react'
import { diagnose } from './api'
import { supabase } from './supabaseClient'
import { saveExpertDiagnosis } from './services/diagnosisHistory'

import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'

import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import KnowledgeAdminPage from './pages/KnowledgeAdminPage'
import VetMapPage from './pages/VetMapPage'

import WelcomeScreen from './components/WelcomeScreen'
import InitialSymptomSelector from './components/InitialSymptomSelector'
import DynamicInterview from './components/DynamicInterview'
import DiagnosisResult from './components/DiagnosisResult'
import ImageClassifier from './components/ImageClassifier'

function parseErrorMessage(error) {
  if (error?.response?.data?.detail) return String(error.response.data.detail)
  if (error?.message) return String(error.message)
  return 'Không thể kết nối API chẩn đoán.'
}

export default function App() {
  const [session, setSession] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  // Page: 'home' | 'expert' | 'vision' | 'map' | 'admin'
  const [activePage, setActivePage] = useState('home')

  // Expert flow state
  const [expertMode, setExpertMode] = useState('welcome') // welcome | initial | interview | result
  const [knownSymptoms, setKnownSymptoms] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [expertHistoryStatus, setExpertHistoryStatus] = useState('idle')
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setIsAuthLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsAuthLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setActivePage('home')
    setExpertMode('welcome')
    setKnownSymptoms({})
    setResults([])
    setErrorMessage('')
    setExpertHistoryStatus('idle')
    setHistoryRefreshKey(0)
  }

  // Khi chuyển tab
  const handleNavigate = (page) => {
    setActivePage(page)
    if (page === 'expert') {
      // Reset về welcome khi vào tab Hỏi Bệnh
      if (expertMode === 'result') {
        setExpertMode('welcome')
        setResults([])
        setKnownSymptoms({})
      }
    }
    setErrorMessage('')
  }

  // Expert flow handlers
  const handleStartExpert = () => {
    setKnownSymptoms({})
    setResults([])
    setErrorMessage('')
    setExpertMode('initial')
  }

  const handleInitialSubmit = (initialData) => {
    setKnownSymptoms({ ...knownSymptoms, ...initialData })
    setExpertMode('interview')
  }

  const handleInterviewComplete = async (finalData) => {
    const allSymptoms = { ...knownSymptoms, ...finalData }
    setKnownSymptoms(allSymptoms)
    setIsLoading(true)
    setErrorMessage('')
    setExpertHistoryStatus('idle')
    setExpertMode('result')
    try {
      const payload = await diagnose(allSymptoms)
      const resultData = payload?.data?.data || payload?.data || []
      setResults(resultData)
      setExpertHistoryStatus('saving')
      saveExpertDiagnosis({
        userId: session.user.id,
        symptomsInput: allSymptoms,
        results: resultData,
      })
        .then(() => {
          setExpertHistoryStatus('saved')
          setHistoryRefreshKey((current) => current + 1)
        })
        .catch((historyError) => {
          console.warn('Không thể lưu lịch sử hệ chuyên gia:', historyError)
          setExpertHistoryStatus('error')
        })
    } catch (error) {
      setResults([])
      setErrorMessage(parseErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestartExpert = () => {
    setExpertMode('initial')
    setKnownSymptoms({})
    setResults([])
    setErrorMessage('')
    setExpertHistoryStatus('idle')
  }

  // Render nội dung tab Expert
  const renderExpertContent = () => {
    if (expertMode === 'welcome') {
      return (
        <WelcomeScreen
          onStartExpert={handleStartExpert}
          onStartVision={() => handleNavigate('vision')}
        />
      )
    }
    if (expertMode === 'initial') {
      return <InitialSymptomSelector onSubmit={handleInitialSubmit} />
    }
    if (expertMode === 'interview') {
      return <DynamicInterview currentKnown={knownSymptoms} onComplete={handleInterviewComplete} />
    }
    if (expertMode === 'result') {
      return (
        <>
          {errorMessage && (
            <div className="mb-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 text-center shadow-sm">
              🚨 Lỗi: {errorMessage}
            </div>
          )}
          <DiagnosisResult
            results={results}
            isLoading={isLoading}
            onRestart={handleRestartExpert}
            historyStatus={expertHistoryStatus}
          />
        </>
      )
    }
  }

  // Render nội dung theo active page
  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return (
          <HomePage
            onNavigate={handleNavigate}
            userId={session.user.id}
            userEmail={session.user?.email}
            userMetadata={session.user?.user_metadata}
            refreshKey={historyRefreshKey}
          />
        )
      case 'expert':
        return (
          <div className="flex flex-col gap-0">
            {renderExpertContent()}
          </div>
        )
      case 'vision':
        return (
          <ImageClassifier
            userId={session.user.id}
            onHistorySaved={() => setHistoryRefreshKey((current) => current + 1)}
          />
        )
      case 'map':
        return <VetMapPage />
      case 'admin':
        return <KnowledgeAdminPage />
      default:
        return (
          <HomePage
            onNavigate={handleNavigate}
            userId={session.user.id}
            userEmail={session.user?.email}
            userMetadata={session.user?.user_metadata}
            refreshKey={historyRefreshKey}
          />
        )
    }
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-4">
        <div className="rounded-3xl border border-slate-100 bg-white px-6 py-5 text-center shadow-xl">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-600" />
          <p className="text-sm font-bold text-slate-700">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return <AuthPage />
  }

  return (
    <div className="flex min-h-screen bg-page">
      {/* Desktop Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        userEmail={session.user?.email}
        onSignOut={handleSignOut}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-100 shadow-sm px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-base shrink-0">🐷</div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none">Pig Diagnostic AI</p>
                <p className="text-sm font-bold text-slate-800 leading-tight truncate">Chẩn Đoán Thú Y</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm active:scale-95"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        {/* Desktop Page Header */}
        <header className="hidden md:block px-8 pt-7 pb-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Pig Diagnostic Expert System</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-800 tracking-tight">Trợ Lý Chẩn Đoán Thú Y</h1>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 pb-24 md:pb-8 md:px-8 pt-4">
          {renderPage()}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <BottomNav activePage={activePage} onNavigate={handleNavigate} />
    </div>
  )
}
