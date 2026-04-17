import React from 'react';

export default function WelcomeScreen({ onStart }) {
  return (
    <div className="w-full animate-fade-in flex flex-col h-full">
      
      {/* 1. Phần Header & Nút Bắt Đầu (Call to Action) */}
      <div className="flex flex-col items-center justify-center py-8 text-center border-b border-gray-100">
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        
        <h2 className="mb-2 text-3xl font-bold text-slate-800 tracking-tight">
          Chào bạn, đàn lợn hôm nay thế nào?
        </h2>
        <p className="mb-8 max-w-lg text-slate-500">
          Hãy chia sẻ các dấu hiệu bất thường. Bác sĩ ảo sẽ phân tích và đưa ra phác đồ xử lý kịp thời nhất cho trang trại của bạn.
        </p>
        
        <button 
          onClick={onStart}
          className="group relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-emerald-600 px-8 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:bg-emerald-500 hover:shadow-emerald-500/30 hover:-translate-y-1 active:scale-95"
        >
          <span className="mr-2 text-xl">🩺</span>
          <span className="text-lg">Chẩn đoán bệnh mới</span>
          <div className="absolute inset-0 h-full w-full scale-0 rounded-xl transition-all duration-300 group-hover:scale-100 group-hover:bg-white/10"></div>
        </button>
      </div>

      {/* 2. Phần Lịch sử chẩn đoán (Empty State chờ kết nối Database) */}
      <div className="flex-1 py-12 px-2 flex flex-col items-center justify-center opacity-70">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-base font-semibold text-slate-500">Chưa có lịch sử chẩn đoán</h3>
        <p className="text-sm text-slate-400 mt-1 text-center max-w-xs">
          Hồ sơ các ca bệnh và phác đồ điều trị sẽ được lưu tự động tại đây sau khi bạn hoàn tất chẩn đoán.
        </p>
      </div>
      
    </div>
  );
}