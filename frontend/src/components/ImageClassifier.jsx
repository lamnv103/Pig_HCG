import React, { useState, useRef } from 'react';
import { predictImage } from '../api';
import { ENGLISH_TO_DISEASE_ID, getDiseaseTypeStyle } from '../data/knowledge_map';
import { diseaseById } from '../data/knowledge';
import { saveVisionDiagnosis } from '../services/diagnosisHistory';

function HistoryStatus({ status }) {
  const statusMap = {
    saving: { label: 'Đang lưu hồ sơ...', cls: 'bg-blue-50 text-blue-700 border-blue-100' },
    saved: { label: 'Đã tự động lưu vào dashboard', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    error: { label: 'Chưa lưu được lịch sử', cls: 'bg-rose-50 text-rose-700 border-rose-100' },
  };

  const info = statusMap[status];
  if (!info) return null;

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${info.cls}`}>
      {info.label}
    </div>
  );
}

export default function ImageClassifier({ userId, onHistorySaved }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [historyStatus, setHistoryStatus] = useState('idle');
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResult(null);
      setError('');
      setHistoryStatus('idle');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setResult(null);
      setError('');
      setHistoryStatus('idle');
    }
  };

  const handlePredict = async () => {
    if (!file) return;
    setIsLoading(true);
    setError('');
    setHistoryStatus('idle');
    try {
      const response = await predictImage(file);
      if (response.data.success) {
        const data = response.data;
        // Nếu backend chưa trả về disease_detail, lookup từ frontend
        if (!data.disease_detail && data.english_name) {
          const diseaseId = ENGLISH_TO_DISEASE_ID[data.english_name];
          data.disease_detail = diseaseId ? diseaseById[diseaseId] : null;
          data.disease_id = diseaseId;
        }
        setResult(data);
        setHistoryStatus('saving');
        try {
          await saveVisionDiagnosis({ userId, file, result: data });
          setHistoryStatus('saved');
          onHistorySaved?.();
        } catch (historyError) {
          console.warn('Không thể lưu lịch sử AI hình ảnh:', historyError);
          setHistoryStatus('error');
        }
      } else {
        setError('Lỗi khi xử lý hình ảnh.');
      }
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Không thể kết nối với AI Nhận diện.');
    } finally {
      setIsLoading(false);
    }
  };

  const typeStyle = result ? getDiseaseTypeStyle(result.english_name) : null;
  const isHealthy = result?.english_name === 'Healthy';
  const detail = result?.disease_detail;
  const isHighConf = result?.confidence >= 80;

  return (
    <div className="flex flex-col gap-5 animate-fade-in w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span>📸</span> AI Nhận Diện Bệnh Ngoài Da
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* === CỘT TRÁI: Upload === */}
        <div className="flex flex-col gap-3">
          {/* Drag & Drop Zone */}
          <label
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`relative flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-3xl cursor-pointer transition-all duration-200 ${
              preview
                ? 'border-emerald-300 bg-emerald-50/30 p-1'
                : 'border-slate-300 bg-slate-50 hover:border-emerald-400 hover:bg-emerald-50'
            }`}
          >
            <input ref={inputRef} type="file" hidden accept="image/*" onChange={handleFileChange} />
            {!preview ? (
              <div className="text-center p-4">
                <div className="text-5xl mb-3">📤</div>
                <div className="text-base font-bold text-slate-700">Tải ảnh da lợn lên</div>
                <div className="text-xs text-slate-400 mt-1">Kéo thả hoặc nhấn để chọn · PNG, JPG, JPEG</div>
              </div>
            ) : (
              <img src={preview} alt="Preview" className={`h-full w-full object-cover rounded-[22px] ${result && !isHealthy ? 'ring-2 ring-orange-400' : ''}`} />
            )}
          </label>

          {/* Predict Button */}
          <button
            onClick={handlePredict}
            disabled={!file || isLoading}
            id="btn-predict-image"
            className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-md text-sm ${
              !file || isLoading
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 hover:shadow-emerald-200 hover:shadow-lg'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ProtoNet đang phân tích...
              </span>
            ) : '🔍 Phân Tích Hình Ảnh'}
          </button>

          {error && (
            <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl text-sm border border-rose-100">
              ⚠️ {error}
            </div>
          )}

        </div>

        {/* === CỘT PHẢI: Kết quả === */}
        <div className={`flex flex-col rounded-3xl border p-5 min-h-[280px] transition-all duration-300 ${
          result && typeStyle ? `${typeStyle.border} ${typeStyle.bg}` : 'border-slate-100 bg-slate-50'
        }`}>
          <h3 className="font-bold text-slate-700 mb-3 border-b border-slate-200/70 pb-2 text-sm uppercase tracking-wider">
            Kết Quả Chẩn Đoán
          </h3>

          {!result && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center gap-2">
              <span className="text-4xl">🤖</span>
              <p className="text-sm">AI đang chờ hình ảnh từ bạn.</p>
            </div>
          )}

          {isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center text-emerald-600">
              <div className="h-10 w-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-3" />
              <p className="font-semibold text-sm">Mô hình ProtoNet đang xử lý...</p>
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-4 animate-fade-in">
              {/* Tên bệnh & badge */}
              <div className="flex items-start gap-3">
                <span className="text-3xl">{typeStyle?.icon}</span>
                <div className="flex-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeStyle?.badge}`}>
                    {isHealthy ? 'Da khỏe mạnh' : 'Phát hiện bệnh'}
                  </span>
                  <div className="mt-1 text-lg font-bold text-slate-800">{result.predicted_class}</div>
                </div>
              </div>

              {/* Confidence bar */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                  <span>Độ tin cậy AI</span>
                  <span className={isHighConf ? 'text-rose-600' : 'text-amber-600'}>{result.confidence}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${isHighConf ? 'bg-rose-500' : 'bg-amber-400'}`}
                    style={{ width: `${result.confidence}%` }}
                  />
                </div>
              </div>

              {/* Phác đồ (nếu có) */}
              {!isHealthy && detail && (
                <div className="space-y-2">
                  {detail.hallmark && (
                    <div className="bg-white/70 rounded-xl p-3 text-xs border border-slate-100">
                      <span className="font-bold text-slate-600 block mb-0.5">🔍 Đặc điểm nhận biết:</span>
                      <span className="text-slate-700">{detail.hallmark}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-2">
                    {detail.prevention && (
                      <div className="bg-blue-50/80 rounded-xl p-3 text-xs border border-blue-100">
                        <span className="font-bold text-blue-700 block mb-0.5">🛡️ Phòng ngừa:</span>
                        <span className="text-blue-900">{detail.prevention}</span>
                      </div>
                    )}
                    {detail.treatment && (
                      <div className="bg-emerald-50/80 rounded-xl p-3 text-xs border border-emerald-100">
                        <span className="font-bold text-emerald-700 block mb-0.5">💊 Điều trị:</span>
                        <span className="text-emerald-900">{detail.treatment}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Healthy message */}
              {isHealthy && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <div className="text-3xl mb-1">✅</div>
                  <p className="font-bold text-emerald-700">Da lợn khỏe mạnh!</p>
                  <p className="text-xs text-emerald-600 mt-1">Không phát hiện dấu hiệu bệnh ngoài da.</p>
                </div>
              )}

              {/* Top 3 */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Top 3 khả năng cao nhất:</p>
                <div className="space-y-1.5">
                  {result.top_predictions.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white/80 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <span className="font-medium text-slate-700 truncate">{item.disease}</span>
                      <span className="font-bold text-emerald-600 ml-2 shrink-0">{item.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <HistoryStatus status={historyStatus} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
