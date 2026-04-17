import React, { useState, useMemo } from 'react';
import { symptomCatalog } from '../data/knowledge';

export default function InitialSymptomSelector({ onSubmit }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Lưu trữ triệu chứng đã chọn: { id_triệu_chứng: muc_do_0_den_100 }
  const [selectedSymptoms, setSelectedSymptoms] = useState({});
  
  // Quản lý Bottom-sheet
  const [activeSymptom, setActiveSymptom] = useState(null); 
  const [tempCF, setTempCF] = useState(100); // Mặc định 100% khi mở slider

  // Lọc danh sách triệu chứng dựa trên thanh tìm kiếm
  const filteredSymptoms = useMemo(() => {
    if (!searchTerm.trim()) {
      return symptomCatalog.slice(0, 12); // Hiển thị 12 cái phổ biến nhất nếu chưa gõ tìm kiếm
    }
    const lowerTerm = searchTerm.toLowerCase();
    return symptomCatalog.filter(sym =>
      sym.question.toLowerCase().includes(lowerTerm)
    );
  }, [searchTerm]);

  // Mở bottom sheet để điều chỉnh độ tin cậy
  const openCFSelector = (sym) => {
    setActiveSymptom(sym);
    setTempCF(selectedSymptoms[sym.id] !== undefined ? selectedSymptoms[sym.id] : 100);
  };

  // Lưu độ tin cậy và đóng bottom sheet
  const handleSaveCF = () => {
    setSelectedSymptoms(prev => ({
      ...prev,
      [activeSymptom.id]: tempCF
    }));
    setActiveSymptom(null);
  };

  // Bỏ chọn triệu chứng
  const handleRemoveSymptom = (id, e) => {
    e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài mở bottom sheet
    setSelectedSymptoms(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Nút "Tiếp tục khám"
  const handleNext = () => {
    const initialData = {};
    // Chuyển đổi thang 0-100 về thang 0.0 - 1.0 cho backend Prolog
    for (const [id, cfValue] of Object.entries(selectedSymptoms)) {
      initialData[id] = cfValue / 100.0;
    }
    onSubmit(initialData);
  };

  return (
    <div className="flex h-full flex-col py-4 animate-fade-in relative">
      
      {/* 1. Tiêu đề & Thanh tìm kiếm */}
      <div className="mb-6">
        <h2 className="mb-2 text-2xl font-bold text-slate-800">Triệu chứng ban đầu</h2>
        <p className="mb-4 text-sm text-slate-500">
          Hãy chọn các dấu hiệu dễ thấy nhất trên đàn lợn.
        </p>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <span className="text-slate-400">🔍</span>
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 pl-11 text-sm outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            placeholder="Tìm kiếm nhanh (VD: sưng khớp, bỏ ăn)..."
          />
        </div>
      </div>
      
      {/* 2. Khu vực hiển thị Tags/Chips */}
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="flex flex-wrap gap-2.5">
          {filteredSymptoms.map((sym) => {
            const isSelected = selectedSymptoms[sym.id] !== undefined;
            const cfValue = selectedSymptoms[sym.id];

            return (
              <button
                key={sym.id}
                onClick={() => openCFSelector(sym)}
                className={`group relative flex max-w-full items-center rounded-2xl border px-4 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                  isSelected 
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm' 
                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50/50'
                }`}
              >
                <span className="line-clamp-2">{sym.question}</span>
                
                {/* Hiển thị % nếu đã chọn */}
                {isSelected && (
                  <span className="ml-2 whitespace-nowrap rounded-lg bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white">
                    {cfValue}%
                  </span>
                )}

                {/* Nút X để xóa nhanh khi hover (chỉ hiện khi đã chọn) */}
                {isSelected && (
                  <div 
                    onClick={(e) => handleRemoveSymptom(sym.id, e)}
                    className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white shadow group-hover:flex hover:bg-rose-600 z-10"
                  >
                    ×
                  </div>
                )}
              </button>
            );
          })}
          
          {filteredSymptoms.length === 0 && (
            <div className="w-full py-8 text-center text-sm text-slate-400">
              Không tìm thấy triệu chứng phù hợp với từ khóa.
            </div>
          )}
        </div>
      </div>

      {/* 3. Nút Tiếp tục khám */}
      <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
        <button 
          onClick={handleNext}
          className="flex items-center rounded-xl bg-emerald-600 px-8 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-95"
        >
          <span>Tiếp tục khám</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="ml-2 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* 4. Bottom-sheet (Modal trượt từ dưới lên) để chọn CF */}
      {activeSymptom && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity sm:items-center">
          <div className="w-full max-w-md animate-slide-up rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            
            <div className="mb-4 text-center">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden"></div>
              <h3 className="text-lg font-bold text-slate-800">
                Bạn có chắc chắn về triệu chứng này không?
              </h3>
              <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-600 border border-slate-100">
                "{activeSymptom.question}"
              </p>
            </div>

            <div className="py-6">
              <div className="mb-2 flex justify-between text-sm font-bold text-slate-600">
                <span>0% (Phân vân)</span>
                <span className="text-emerald-600 text-lg">{tempCF}%</span>
                <span>100% (Rõ ràng)</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                step="5"
                value={tempCF}
                onChange={(e) => setTempCF(Number(e.target.value))}
                className="h-2.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-emerald-600"
              />
            </div>

            <div className="mt-4 flex gap-3">
              <button 
                onClick={() => setActiveSymptom(null)}
                className="flex-1 rounded-xl bg-slate-100 py-3.5 font-bold text-slate-700 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button 
                onClick={handleSaveCF}
                className="flex-1 rounded-xl bg-emerald-600 py-3.5 font-bold text-white shadow-md hover:bg-emerald-500"
              >
                Lưu mức độ
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}