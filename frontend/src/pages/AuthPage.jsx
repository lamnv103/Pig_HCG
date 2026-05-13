import { useState } from 'react'
import { supabase } from '../supabaseClient'

const initialForm = {
  email: '',
  password: '',
  farmName: '',
  location: '',
  scale: '',
}

function getAuthErrorMessage(error) {
  if (!error?.message) return 'Không thể kết nối Supabase. Vui lòng thử lại.'
  if (error.message.includes('Invalid login credentials')) {
    return 'Email hoặc mật khẩu không đúng.'
  }
  if (error.message.includes('User already registered')) {
    return 'Email này đã được đăng ký.'
  }
  if (error.message.includes('Password should be at least')) {
    return 'Mật khẩu cần có ít nhất 6 ký tự.'
  }
  return error.message
}

export default function AuthPage() {
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const isSignUp = mode === 'signup'

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setMessage('')
    setErrorMessage('')
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const buildProfile = (userId) => ({
    id: userId,
    farm_name: form.farmName.trim() || null,
    location: form.location.trim() || null,
    scale: form.scale ? Number(form.scale) : null,
  })

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')
    setErrorMessage('')

    try {
      const email = form.email.trim()
      const password = form.password

      if (password.length < 6) {
        throw new Error('Password should be at least 6 characters')
      }

      if (!isSignUp) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        setMessage('Đăng nhập thành công.')
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            farm_name: form.farmName.trim(),
            location: form.location.trim(),
            scale: form.scale ? Number(form.scale) : null,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(buildProfile(data.user.id), { onConflict: 'id' })

        if (profileError) throw profileError
      }

      setMessage(
        data.session
          ? 'Đăng ký thành công.'
          : 'Đăng ký thành công. Nếu Supabase đang bật xác thực email, hãy kiểm tra hộp thư trước khi đăng nhập.',
      )
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-page px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-5xl grid gap-6 md:grid-cols-[1fr_420px] items-center">
        <section className="hidden md:block">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-600">
            Pig Diagnostic Expert System
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Quản lý chẩn đoán bệnh heo theo từng nông trại
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600">
            Đăng nhập để lưu thông tin nông trại, theo dõi lịch sử chẩn đoán và đồng bộ dữ liệu với Supabase.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl">
            {[
              { value: '40+', label: 'Bệnh trong KB' },
              { value: '60+', label: 'Luật Prolog' },
              { value: '9', label: 'Bệnh da AI' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                <p className="text-2xl font-extrabold text-emerald-700">{item.value}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xl md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-xl text-white">
              🐷
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">Pig Diagnostic</p>
              <h2 className="text-lg font-bold text-slate-900">
                {isSignUp ? 'Tạo tài khoản' : 'Đăng nhập'}
              </h2>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => handleModeChange('signin')}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                !isSignUp ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('signup')}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
                isSignUp ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Đăng ký
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="ten@example.com"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Mật khẩu</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                placeholder="Ít nhất 6 ký tự"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </label>

            {isSignUp && (
              <div className="space-y-4 rounded-2xl bg-slate-50 p-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Tên nông trại
                  </span>
                  <input
                    type="text"
                    name="farmName"
                    value={form.farmName}
                    onChange={handleChange}
                    placeholder="Ví dụ: Trại heo Minh An"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Địa điểm</span>
                  <input
                    type="text"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Tỉnh / huyện"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Quy mô đàn</span>
                  <input
                    type="number"
                    name="scale"
                    value={form.scale}
                    onChange={handleChange}
                    min="0"
                    placeholder="Số lượng heo"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
              </div>
            )}

            {errorMessage && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {errorMessage}
              </div>
            )}

            {message && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
            >
              {isSubmitting ? 'Đang xử lý...' : isSignUp ? 'Tạo tài khoản' : 'Đăng nhập'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
