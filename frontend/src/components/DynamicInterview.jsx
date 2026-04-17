import React, { useState, useMemo, useEffect } from 'react';
import { symptomCatalog, rules } from '../data/knowledge'; // Đảm bảo knowledge.js có export 'rules'

export default function DynamicInterview({ currentKnown, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0); // Dùng làm askCount
  const [sliderValue, setSliderValue] = useState(0.5);
  const [animState, setAnimState] = useState('active');

  // 1. TỔNG HỢP KIẾN THỨC HIỆN TẠI (Triệu chứng ban đầu + Câu trả lời mới)
  const allKnown = useMemo(() => ({ ...currentKnown, ...answers }), [currentKnown, answers]);

  // 2. BỘ NÃO SUY LUẬN ĐỘNG (HEURISTIC ENGINE)
  const currentQuestion = useMemo(() => {
    let bestScore = -1;
    let nextSymId = null;

    // Quét qua toàn bộ tập luật để tìm manh mối
    for (const rule of (rules || [])) {
      let positiveCount = 0;
      let missingPremises = [];
      let hasStrongNegative = false;

      // Phân tích các điều kiện (IF) của luật này
      for (const symId of rule.if) {
        if (allKnown[symId] > 0) {
          positiveCount++; // Đã có triệu chứng này -> Luật này đang "Nóng"
        } else if (allKnown[symId] < 0) {
          hasStrongNegative = true; // Bị phủ định -> Loại trừ luôn luật này
        } else if (allKnown[symId] === undefined) {
          missingPremises.push(symId); // Triệu chứng còn thiếu để kết luận luật này
        }
      }

      // Bỏ qua luật nếu người dùng đã chốt là "Chắc chắn Không" với một triệu chứng cốt lõi của nó
      if (hasStrongNegative) continue;

      // Nếu luật này đang có tiềm năng (đã khớp ít nhất 1 triệu chứng, và còn thiếu dữ kiện)
      if (positiveCount > 0 && missingPremises.length > 0) {
        // Chấm điểm luật: Tỷ lệ hoàn thành càng cao thì càng ưu tiên hỏi
        // (VD: Cần 3 triệu chứng, đã có 2, thiếu 1 -> Điểm cao, hỏi ngay!)
        const completionRate = positiveCount / rule.if.length;
        const score = completionRate + (rule.cf * 0.1); // Cộng điểm ưu tiên cho luật có CF cao

        if (score > bestScore) {
          bestScore = score;
          nextSymId = missingPremises[0]; // Chọn triệu chứng còn thiếu để hỏi
        }
      }
    }

    // A. Nếu tìm thấy một triệu chứng "nóng" cần xoáy sâu
    if (nextSymId) {
      return symptomCatalog.find(s => s.id === nextSymId);
    }

    // B. Nếu KHÔNG có luật nào đang "nóng" (ví dụ: người dùng nhập triệu chứng quá chung chung)
    // -> Tìm một triệu chứng chưa hỏi để mở rộng manh mối (Tối đa hỏi mò 3 câu)
    if (currentIndex < 3) {
        const unasked = symptomCatalog.find(s => allKnown[s.id] === undefined);
        return unasked || null;
    }

    // C. Trả về null nghĩa là: 
    // 1. Đã chẩn đoán chắc chắn (các luật đã full).
    // 2. Hết manh mối, hỏi thêm cũng vô dụng.
    return null;

  }, [allKnown, currentIndex]);

  // 3. ĐIỀU KIỆN DỪNG ĐỘNG (DYNAMIC STOP)
  useEffect(() => {
    // Nếu thuật toán trả về null (đã đủ dữ kiện chẩn đoán) HOẶC đã hỏi quá 7 câu (tránh làm phiền)
    if (!currentQuestion || currentIndex >= 7) {
      // Đợi 500ms để người dùng xem nốt animation rồi mới chuyển màn hình
      const timer = setTimeout(() => {
        onComplete(answers);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, currentIndex, answers, onComplete]);

  // 4. XỬ LÝ TRẢ LỜI & HIỆU ỨNG TRƯỢT
  const handleAnswer = (cfValue) => {
    setAnimState('exit-left'); // Trượt cũ ra

    setTimeout(() => {
      // Lưu câu trả lời
      const newAnswers = { ...answers, [currentQuestion.id]: parseFloat(cfValue) };
      setAnswers(newAnswers);
      
      setCurrentIndex(prev => prev + 1);
      setSliderValue(0.5); 
      
      setAnimState('enter-right'); // Đưa câu mới vào chờ
      setTimeout(() => setAnimState('active'), 50); 
    }, 300);
  };

  // Render trạng thái chờ khi đang chuyển màn hình (do useEffect trigger onComplete)
  if (!currentQuestion) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-12 animate-pulse">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-500 mb-4"></div>
        <p className="text-slate-500 font-medium">Đã thu thập đủ dữ kiện, đang kết luận...</p>
      </div>
    );
  }

  const getTransformClass = () => {
    if (animState === 'exit-left') return '-translate-x-[120%] opacity-0 scale-95';
    if (animState === 'enter-right') return 'translate-x-[120%] opacity-0 scale-95';
    return 'translate-x-0 opacity-100 scale-100'; 
  };

  return (
    <div className="flex h-full flex-col items-center py-6 px-4 relative overflow-hidden">
      
      {/* THANH TIẾN TRÌNH THEO ĐỘ SÂU */}
      <div className="mb-8 w-full max-w-lg">
        <div className="mb-2 flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
          <span>Đang điều tra manh mối...</span>
          <span className="text-emerald-600">Câu hỏi thứ {currentIndex + 1}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 flex gap-1">
           {Array.from({ length: currentIndex + 1 }).map((_, i) => (
             <div key={i} className="h-full flex-1 rounded-full bg-emerald-500 transition-all duration-300"></div>
           ))}
           <div className="h-full flex-[5] rounded-full bg-slate-100"></div>
        </div>
      </div>

      <div className={`w-full max-w-lg flex-1 flex flex-col items-center transition-all duration-300 ease-in-out ${getTransformClass()}`}>
        
        {/* KHUNG CÂU HỎI */}
        <div className="mb-8 w-full rounded-3xl bg-slate-50 p-6 sm:p-8 text-center border border-slate-100 shadow-sm relative min-h-[160px] flex items-center justify-center">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-1 rounded-full border border-slate-100 text-sm font-bold text-emerald-600 shadow-sm">
            Phân tích chuyên sâu
          </div>
          <h3 className="text-xl font-semibold text-slate-800 md:text-2xl leading-snug">
            {currentQuestion.question}
          </h3>
        </div>

        {/* THANH TRƯỢT CF */}
        <div className="mb-8 w-full px-4">
          <div className="mb-3 flex justify-between text-sm font-bold text-slate-500">
            <span className="text-rose-600">-1.0 (Không)</span>
            <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">CF: {sliderValue.toFixed(1)}</span>
            <span className="text-emerald-600">1.0 (Có)</span>
          </div>
          <input 
            type="range" min="-1.0" max="1.0" step="0.1"
            value={sliderValue}
            onChange={(e) => setSliderValue(parseFloat(e.target.value))}
            className="h-3 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-emerald-600 focus:outline-none"
          />
          <button 
            onClick={() => handleAnswer(sliderValue)}
            className="mt-4 w-full rounded-xl bg-slate-800 py-3 font-bold text-white transition-all hover:bg-slate-700 active:scale-95 shadow-md"
          >
            Xác nhận mức độ
          </button>
        </div>

        <div className="w-full flex items-center justify-center my-2 text-slate-300 font-medium text-sm">
          <span className="h-px bg-slate-200 flex-1"></span>
          <span className="px-4">CHỌN NHANH</span>
          <span className="h-px bg-slate-200 flex-1"></span>
        </div>

        {/* CÁC NÚT BẤM */}
        <div className="grid w-full grid-cols-2 gap-3 mt-4">
          <button onClick={() => handleAnswer(1.0)} className="flex flex-col items-center justify-center rounded-2xl border-2 border-emerald-100 bg-white p-3 font-bold text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all">
            <span className="text-lg mb-1">👍</span><span>Chắc chắn Có</span>
          </button>
          <button onClick={() => handleAnswer(0.5)} className="flex flex-col items-center justify-center rounded-2xl border-2 border-amber-100 bg-white p-3 font-bold text-amber-700 hover:bg-amber-50 active:scale-95 transition-all">
            <span className="text-lg mb-1">🤔</span><span>Không rõ lắm</span>
          </button>
          <button onClick={() => handleAnswer(-1.0)} className="flex flex-col items-center justify-center rounded-2xl border-2 border-rose-100 bg-white p-3 font-bold text-rose-700 hover:bg-rose-50 active:scale-95 transition-all">
            <span className="text-lg mb-1">🙅‍♂️</span><span>Chắc chắn KHÔNG</span>
          </button>
          <button onClick={() => handleAnswer(0.0)} className="flex flex-col items-center justify-center rounded-2xl border-2 border-slate-100 bg-white p-3 font-bold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">
            <span className="text-lg mb-1">⏭️</span><span>Bỏ qua</span>
          </button>
        </div>

      </div>
    </div>
  );
}