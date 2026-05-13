import React, { useEffect, useMemo, useState } from 'react';
import {
  deleteDiagnosisHistory,
  fetchDiagnosisHistory,
  fetchMonthlyDiagnosisCount,
  fetchUserProfile,
} from '../services/diagnosisHistory';

const TYPE_META = {
  EXPERT: {
    label: 'Hệ chuyên gia',
    icon: '🩺',
    badge: 'bg-emerald-100 text-emerald-700',
    border: 'border-emerald-200',
  },
  VISION: {
    label: 'AI hình ảnh',
    icon: '📸',
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-blue-200',
  },
};

function formatDate(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

function formatShortDate(isoString) {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return '--/--';
  }
}

function getRecordType(record) {
  return String(record?.type || '').toUpperCase();
}

function getRecordSummary(record) {
  const payload = record?.diagnosis_results || {};
  const firstResult = Array.isArray(payload.results) ? payload.results[0] : null;
  const detail = payload.disease_detail || firstResult || {};

  return {
    source: payload.source || TYPE_META[getRecordType(record)]?.label || 'Chẩn đoán',
    topDisease: payload.top_disease || firstResult?.disease || 'Không xác định',
    confidence: Number(payload.top_confidence ?? firstResult?.confidence ?? 0),
    hallmark: detail.hallmark || firstResult?.hallmark || null,
    prevention: detail.prevention || firstResult?.prevention || 'Chưa có hướng dẫn phòng ngừa trong hồ sơ.',
    treatment: detail.treatment || firstResult?.treatment || 'Chưa có phác đồ điều trị trong hồ sơ.',
    cause: detail.cause || firstResult?.cause || null,
    results: payload.results || [],
    topPredictions: payload.top_predictions || firstResult?.top_predictions || [],
    imageFile: payload.image_file || null,
  };
}

function getActiveSymptoms(symptomsInput) {
  if (!symptomsInput || typeof symptomsInput !== 'object') return [];

  return Object.entries(symptomsInput)
    .filter(([, value]) => {
      if (typeof value === 'number') return value > 0;
      if (typeof value === 'string') return value !== '0' && value.trim() !== '';
      return Boolean(value);
    })
    .slice(0, 10);
}

function RecordDetailModal({ record, onClose, onNavigateMap }) {
  const type = getRecordType(record);
  const meta = TYPE_META[type] || TYPE_META.EXPERT;
  const summary = getRecordSummary(record);
  const activeSymptoms = getActiveSymptoms(record.symptoms_input);
  const isHighRisk = summary.confidence >= 80;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${meta.badge}`}>
                  {meta.icon} {meta.label}
                </span>
                {isHighRisk && (
                  <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                    Nguy cơ cao
                  </span>
                )}
              </div>
              <h3 className="truncate text-lg font-extrabold text-slate-900">{summary.topDisease}</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">{formatDate(record.created_at)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Đóng
            </button>
          </div>
        </header>

        <div className="space-y-5 p-5">
          {record.image_url && (
            <img
              src={record.image_url}
              alt={summary.topDisease}
              className="h-60 w-full rounded-2xl border border-slate-100 object-cover"
            />
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Độ tin cậy</p>
              <p className={`mt-1 text-2xl font-extrabold ${isHighRisk ? 'text-rose-600' : 'text-amber-600'}`}>
                {summary.confidence}%
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 md:col-span-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Nguồn chẩn đoán</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{summary.source}</p>
              {summary.imageFile?.name && (
                <p className="mt-1 truncate text-xs text-slate-500">Ảnh: {summary.imageFile.name}</p>
              )}
            </div>
          </div>

          {summary.hallmark && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700">Đặc điểm nhận biết</p>
              <p className="text-sm leading-6 text-amber-950">{summary.hallmark}</p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-700">Phòng ngừa / xử lý</p>
              <p className="text-sm leading-6 text-blue-950">{summary.prevention}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-700">Phác đồ điều trị</p>
              <p className="text-sm leading-6 text-emerald-950">{summary.treatment}</p>
            </div>
          </div>

          {summary.results.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="mb-3 text-sm font-bold text-slate-800">Các khả năng được hệ thống ghi nhận</p>
              <div className="space-y-2">
                {summary.results.slice(0, 5).map((item, index) => (
                  <div key={`${item.disease}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                    <span className="truncate text-sm font-semibold text-slate-700">{item.disease}</span>
                    <span className="shrink-0 text-sm font-extrabold text-emerald-600">{item.confidence}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.topPredictions.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="mb-3 text-sm font-bold text-slate-800">Top dự đoán từ ProtoNet</p>
              <div className="space-y-2">
                {summary.topPredictions.map((item, index) => (
                  <div key={`${item.disease}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                    <span className="truncate text-sm font-semibold text-slate-700">{item.disease}</span>
                    <span className="shrink-0 text-sm font-extrabold text-blue-600">{item.confidence}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSymptoms.length > 0 && (
            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="mb-3 text-sm font-bold text-slate-800">Triệu chứng đã nhập</p>
              <div className="flex flex-wrap gap-2">
                {activeSymptoms.map(([symptom, value]) => (
                  <span key={symptom} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {symptom}: {String(value)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onNavigateMap}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800"
            >
              Tìm trạm thú y gần nhất
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            >
              Quay lại timeline
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function HomePage({ onNavigate, userId, userEmail, userMetadata, refreshKey }) {
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadDashboard() {
      try {
        setIsLoading(true);
        setErrorMessage('');
        const [profileData, historyData, monthCount] = await Promise.all([
          fetchUserProfile(userId),
          fetchDiagnosisHistory(userId, 30),
          fetchMonthlyDiagnosisCount(userId),
        ]);

        if (!isCurrent) return;
        setProfile(profileData);
        setRecords(historyData);
        setMonthlyCount(monthCount);
      } catch (error) {
        if (!isCurrent) return;
        setErrorMessage(error?.message || 'Không thể tải dashboard từ Supabase.');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    if (userId) loadDashboard();

    return () => {
      isCurrent = false;
    };
  }, [userId, refreshKey]);

  const dashboardStats = useMemo(() => {
    const highRiskCount = records.filter((record) => getRecordSummary(record).confidence >= 80).length;
    const visionCount = records.filter((record) => getRecordType(record) === 'VISION').length;

    return [
      { label: 'Ca tháng này', value: monthlyCount, icon: '📅', color: 'text-emerald-600' },
      { label: 'Tổng hồ sơ', value: records.length, icon: '📋', color: 'text-blue-600' },
      { label: 'Nguy cơ cao', value: highRiskCount, icon: '⚠️', color: 'text-rose-600' },
      { label: 'Quét ảnh AI', value: visionCount, icon: '📸', color: 'text-purple-600' },
    ];
  }, [monthlyCount, records]);

  const displayName = profile?.farm_name || userMetadata?.farm_name || userEmail || 'Chủ trang trại';
  const profileMeta = [
    profile?.location || userMetadata?.location,
    profile?.scale ? `${profile.scale} con` : userMetadata?.scale ? `${userMetadata.scale} con` : null,
  ].filter(Boolean);

  const handleClearHistory = async () => {
    setIsClearing(true);
    setErrorMessage('');
    try {
      await deleteDiagnosisHistory(userId);
      setRecords([]);
      setMonthlyCount(0);
      setShowClearConfirm(false);
    } catch (error) {
      setErrorMessage(error?.message || 'Không thể xóa lịch sử.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleNavigateMap = () => {
    setSelectedRecord(null);
    onNavigate('map');
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-4">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-slate-900 p-6 text-white shadow-xl md:p-8">
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-100">Dashboard nông trại</p>
            <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Xin chào, {displayName}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {profileMeta.length > 0 ? (
                profileMeta.map((item) => (
                  <span key={item} className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
                    {item}
                  </span>
                ))
              ) : (
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
                  Hồ sơ nông trại
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              id="home-start-expert"
              onClick={() => onNavigate('expert')}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-700 shadow hover:bg-emerald-50 active:scale-95"
            >
              🩺 Chẩn đoán triệu chứng
            </button>
            <button
              id="home-start-vision"
              onClick={() => onNavigate('vision')}
              className="rounded-2xl bg-sky-500/80 px-5 py-3 text-sm font-extrabold text-white ring-1 ring-white/25 hover:bg-sky-500 active:scale-95"
            >
              📸 Quét ảnh
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {dashboardStats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xl">{stat.icon}</span>
              <span className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</span>
            </div>
            <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-extrabold text-slate-900">Dòng thời gian chẩn đoán</h3>
            <p className="mt-0.5 text-xs font-medium text-slate-500">Các ca gần nhất được đồng bộ từ Supabase</p>
          </div>
          {records.length > 0 && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="rounded-xl px-3 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50"
            >
              Xóa lịch sử
            </button>
          )}
        </div>

        {errorMessage && (
          <div className="m-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 py-12 text-sm font-bold text-slate-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-emerald-500" />
            Đang tải hồ sơ...
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-3 text-4xl">🗂️</div>
            <p className="font-bold text-slate-600">Chưa có ca chẩn đoán nào.</p>
            <p className="mt-1 text-sm text-slate-400">Kết quả từ Prolog và AI hình ảnh sẽ tự động xuất hiện tại đây.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {records.map((record) => {
              const type = getRecordType(record);
              const meta = TYPE_META[type] || TYPE_META.EXPERT;
              const summary = getRecordSummary(record);
              const isHighRisk = summary.confidence >= 80;

              return (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedRecord(record)}
                  className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border bg-white text-xl ${meta.border}`}>
                    {record.image_url ? (
                      <img src={record.image_url} alt="" className="h-full w-full rounded-2xl object-cover" />
                    ) : (
                      meta.icon
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.badge}`}>
                        {meta.label}
                      </span>
                      <span className="text-xs font-medium text-slate-400">{formatShortDate(record.created_at)}</span>
                      {isHighRisk && <span className="text-xs font-bold text-rose-600">Nguy cơ cao</span>}
                    </div>
                    <p className="truncate text-sm font-extrabold text-slate-800">{summary.topDisease}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{summary.treatment}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-extrabold ${isHighRisk ? 'text-rose-600' : 'text-amber-600'}`}>
                      {summary.confidence}%
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">tin cậy</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onNavigateMap={handleNavigateMap}
        />
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 text-center">
              <div className="mb-2 text-4xl">🗑️</div>
              <h3 className="font-extrabold text-slate-900">Xóa toàn bộ timeline?</h3>
              <p className="mt-1 text-sm text-slate-500">Các hồ sơ trong diagnosis_history của tài khoản này sẽ bị xóa.</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 rounded-2xl bg-slate-100 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={isClearing}
                className="flex-1 rounded-2xl bg-rose-500 py-3 text-sm font-extrabold text-white hover:bg-rose-600 disabled:bg-slate-300"
              >
                {isClearing ? 'Đang xóa...' : 'Xóa hết'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
