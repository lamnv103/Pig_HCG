import React from 'react';

export default function WelcomeScreen({ onStartExpert, onStartVision }) {
  return (
    <div className="w-full animate-fade-in flex flex-col items-center justify-center py-6">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      </div>
      
      <h2 className="mb-2 text-3xl font-bold text-slate-800 tracking-tight text-center">
        Hệ Thống Chẩn Đoán Thú Y Thông Minh
      </h2>
      <p className="mb-10 max-w-lg text-slate-500 text-center">
        Lựa chọn phương thức chẩn đoán phù hợp với tình trạng thực tế của đàn lợn nhà bạn.
      </p>

      {/* 2 Nút Lựa Chọn Chức Năng Lớn */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl px-2">
        
        {/* Nút 1: Hệ Chuyên Gia (Prolog) */}
        <button 
          onClick={onStartExpert}
          className="group flex flex-col items-center p-8 rounded-3xl border-2 border-slate-100 bg-white hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="text-6xl mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-2 drop-shadow-sm">🩺</span>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Hỏi Đáp Triệu Chứng</h3>
          <p className="text-sm text-slate-500 text-center leading-relaxed">
            Sử dụng Bác sĩ ảo suy luận dựa trên các biểu hiện lâm sàng (sốt, bỏ ăn, tiêu chảy...).
          </p>
        </button>

        {/* Nút 2: AI Hình Ảnh (ProtoNet) */}
        <button 
          onClick={onStartVision}
          className="group flex flex-col items-center p-8 rounded-3xl border-2 border-slate-100 bg-white hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 shadow-sm hover:shadow-md active:scale-95 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <span className="text-6xl mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-2 drop-shadow-sm">📸</span>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Nhận Diện Bệnh Ngoài Da</h3>
          <p className="text-sm text-slate-500 text-center leading-relaxed">
            Tải ảnh chụp vùng da lợn bị tổn thương lên để AI phân tích và dự đoán bệnh.
          </p>
        </button>
        
      </div>
    </div>
  );
}