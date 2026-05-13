import React from 'react';

const NAV_ITEMS = [
  { id: 'home',   label: 'Trang Chủ', icon: '🏠', desc: 'Dashboard & Lịch sử' },
  { id: 'expert', label: 'Hỏi Bệnh',  icon: '🩺', desc: 'Hệ chuyên gia Prolog' },
  { id: 'vision', label: 'Quét Ảnh',  icon: '📸', desc: 'AI nhận diện da' },
  { id: 'map',    label: 'Thú Y',     icon: '📍', desc: 'Bản đồ trạm thú y' },
];

export default function Sidebar({ activePage, onNavigate, userEmail, onSignOut }) {
  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-white border-r border-slate-100 shadow-sm sticky top-0 shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white text-xl shadow-sm">
            🐷
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Pig Diagnostic</p>
            <h1 className="text-sm font-bold text-slate-800 leading-tight">Hệ Chẩn Đoán Thú Y</h1>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              id={`nav-sidebar-${item.id}`}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all duration-200 group ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
              }`}
            >
              <span className={`text-xl transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}>
                {item.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${isActive ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {item.label}
                </p>
                <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
              </div>
              {isActive && (
                <span className="w-1.5 h-5 bg-emerald-500 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-100">
        {userEmail && (
          <div className="mb-3 rounded-2xl bg-slate-50 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tài khoản</p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-700">{userEmail}</p>
          </div>
        )}
        <button
          type="button"
          onClick={onSignOut}
          className="mb-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        >
          Đăng xuất
        </button>
        <p className="text-[10px] text-slate-400 text-center">
          Expert System v7.0 + ProtoNet AI
        </p>
        <p className="text-[10px] text-slate-300 text-center mt-0.5">
          © 2026 Pig Diagnostic Team
        </p>
      </div>
    </aside>
  );
}
