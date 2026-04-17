import React, { useState } from 'react';
import { diseaseById } from '../data/knowledge';

export default function DiagnosisResult({ results, isLoading, onRestart }) {
  const [expandedId, setExpandedId] = useState(null);

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center animate-pulse py-12">
        <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500"></div>
        <p className="font-medium text-slate-500">Bác sĩ ảo đang tổng hợp tri thức và suy luận...</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="py-12 text-center animate-fade-in flex flex-col items-center">
        <div className="mb-4 text-4xl">🤔</div>
        <h2 className="mb-2 text-xl font-bold text-slate-800">Không tìm thấy bệnh phù hợp</h2>
        <p className="mb-6 max-w-md text-slate-500">Các triệu chứng bạn cung cấp chưa đủ để hệ thống đưa ra kết luận chắc chắn. Hãy thử lại với các triệu chứng rõ ràng hơn.</p>
        <button onClick={onRestart} className="rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-500 transition-all active:scale-95">Khám ca mới</button>
      </div>
    );
  }

  return (
    <div className="py-4 animate-fade-in">
      <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold text-slate-800">📋 Hồ sơ & Phác đồ</h2>
        <button onClick={onRestart} className="text-sm font-bold text-emerald-600 hover:text-emerald-500 hover:underline">
          Khám ca mới
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => {
          // Bọc an toàn dữ liệu để không bị crash nếu Backend chưa trả về Tên bệnh
          const diseaseKey = result.id || result.disease; 
          const detail = diseaseById ? diseaseById[diseaseKey] : {};
          const displayDiseaseName = detail?.name || result.disease;
          
          const isExpanded = expandedId === diseaseKey;
          const isHighRisk = result.confidence >= 80;

          return (
            <div key={diseaseKey} className={`overflow-hidden rounded-2xl border transition-all ${index === 0 ? 'border-emerald-400 shadow-lg shadow-emerald-100' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="p-5">
                <div className="mb-2 flex items-start justify-between">
                  <h3 className="text-lg font-bold text-slate-800">
                    {index === 0 && <span className="mr-2">🔥 Nguy cơ cao nhất:</span>}
                    <span className={index === 0 ? "text-emerald-700" : ""}>{displayDiseaseName}</span>
                  </h3>
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${isHighRisk ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    Độ tin cậy: {result.confidence}%
                  </span>
                </div>
                
                {/* Thanh Progress */}
                <div className="mb-5 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full rounded-full ${isHighRisk ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${result.confidence}%` }}></div>
                </div>

                {/* Hướng dẫn xử lý */}
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-blue-50/80 p-4 border border-blue-100">
                    <span className="mb-2 block text-xs font-bold text-blue-800 uppercase tracking-wider">🛡️ Phòng ngừa / Xử lý:</span>
                    <span className="text-sm text-blue-900 leading-relaxed">{result.prevention || detail?.prevention || "Cần tư vấn thêm từ thú y địa phương."}</span>
                  </div>
                  <div className="rounded-xl bg-emerald-50/80 p-4 border border-emerald-100">
                    <span className="mb-2 block text-xs font-bold text-emerald-800 uppercase tracking-wider">💊 Điều trị:</span>
                    <span className="text-sm text-emerald-900 leading-relaxed">{result.treatment || detail?.treatment || "Chưa có phác đồ cụ thể trong cơ sở tri thức."}</span>
                  </div>
                </div>

                {/* Phần Giải thích (Explainability) */}
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <button 
                    onClick={() => setExpandedId(isExpanded ? null : diseaseKey)}
                    className="text-sm font-semibold text-slate-500 hover:text-emerald-600 transition-colors flex items-center gap-1"
                  >
                    <span>{isExpanded ? '▼' : '▶'}</span>
                    {isExpanded ? 'Ẩn giải thích luồng suy luận' : 'Tại sao hệ thống kết luận bệnh này?'}
                  </button>
                  
                  {isExpanded && (
                    <div className="mt-3 rounded-xl bg-slate-800 p-4 text-xs text-slate-300 shadow-inner">
                      <p className="font-bold text-emerald-400 mb-2">💻 Các luật (Rules) đã kích hoạt trong lõi Prolog:</p>
                      <ul className="flex flex-wrap gap-2">
                        {(result.rules_triggered || []).map((rule, idx) => (
                          <li key={idx} className="font-mono text-[11px] bg-slate-700/50 border border-slate-600 px-2 py-1 rounded-md text-emerald-200">
                            {rule}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-3 text-[10px] text-slate-500 italic">* Hệ thống dùng thuật toán Suy diễn lùi (Backward Chaining) & Hệ số Certainty Factor để tính toán.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}