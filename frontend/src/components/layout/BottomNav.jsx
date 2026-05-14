import React from 'react';

const NAV_ITEMS = [
  { id: 'home',   label: 'Trang Chủ', icon: '🏠' },
  { id: 'expert', label: 'Hỏi Bệnh',  icon: '🩺' },
  { id: 'vision', label: 'Quét Ảnh',  icon: '📸' },
  { id: 'map',    label: 'Thú Y',     icon: '📍' },
  { id: 'admin',  label: 'Tri Thức',  icon: '🧠' },
];

export default function BottomNav({ activePage, onNavigate }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      {NAV_ITEMS.map((item) => {
        const isActive = activePage === item.id;
        return (
          <button
            key={item.id}
            id={`nav-bottom-${item.id}`}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-1 flex-col items-center justify-center py-2.5 gap-0.5 transition-all duration-200 ${
              isActive
                ? 'text-emerald-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className={`text-xl transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
              {item.icon}
            </span>
            <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
              {item.label}
            </span>
            {isActive && (
              <span className="absolute bottom-0 w-10 h-0.5 bg-emerald-500 rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
