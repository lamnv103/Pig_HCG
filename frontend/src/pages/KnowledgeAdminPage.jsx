import React, { useEffect, useMemo, useState } from 'react';
import {
  deleteKnowledgeDisease,
  deleteKnowledgeRule,
  deleteKnowledgeSymptom,
  getKnowledgeBase,
  saveKnowledgeDisease,
  saveKnowledgeRule,
  saveKnowledgeSymptom,
} from '../api';
import { diseaseCatalog, rules as fallbackRules, symptomCatalog } from '../data/knowledge';

const emptyRuleForm = {
  rule_id: '',
  if_symptoms: '',
  then_disease: '',
  cf: '0.8',
  priority: '2',
};

const emptySymptomForm = {
  id: '',
  question: '',
};

const emptyDiseaseForm = {
  id: '',
  name: '',
  group: 'custom',
  age_focus: 'chưa xác định',
  hallmark: '',
  cause: '',
  prevention: '',
  treatment: '',
  cf_threshold: '0.7',
};

function normalizeError(error) {
  return error?.response?.data?.detail || error?.message || 'Có lỗi xảy ra khi cập nhật tri thức.';
}

function toRulePayload(form) {
  return {
    rule_id: form.rule_id.trim(),
    if_symptoms: form.if_symptoms
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    then_disease: form.then_disease.trim(),
    cf: Number(form.cf),
    priority: Number(form.priority),
  };
}

export default function KnowledgeAdminPage() {
  const [knowledge, setKnowledge] = useState({
    symptoms: symptomCatalog,
    diseases: diseaseCatalog,
    rules: fallbackRules,
    metadata: {},
  });
  const [activeTab, setActiveTab] = useState('rules');
  const [searchTerm, setSearchTerm] = useState('');
  const [ruleForm, setRuleForm] = useState(emptyRuleForm);
  const [symptomForm, setSymptomForm] = useState(emptySymptomForm);
  const [diseaseForm, setDiseaseForm] = useState(emptyDiseaseForm);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const refreshKnowledge = async () => {
    const payload = await getKnowledgeBase();
    if (payload?.status !== 'success') return;
    setKnowledge({
      symptoms: payload.symptoms || symptomCatalog,
      diseases: payload.diseases || diseaseCatalog,
      rules: payload.rules || fallbackRules,
      metadata: payload.metadata || {},
    });
  };

  useEffect(() => {
    let isCurrent = true;

    async function loadKnowledge() {
      try {
        const payload = await getKnowledgeBase();
        if (!isCurrent || payload?.status !== 'success') return;
        setKnowledge({
          symptoms: payload.symptoms || symptomCatalog,
          diseases: payload.diseases || diseaseCatalog,
          rules: payload.rules || fallbackRules,
          metadata: payload.metadata || {},
        });
      } catch (error) {
        console.warn('Không thể tải knowledge từ backend, dùng bản frontend:', error);
      }
    }

    loadKnowledge();
    return () => {
      isCurrent = false;
    };
  }, []);

  const diseaseById = useMemo(
    () => Object.fromEntries((knowledge.diseases || []).map((disease) => [disease.id, disease])),
    [knowledge.diseases],
  );

  const symptomById = useMemo(
    () => Object.fromEntries((knowledge.symptoms || []).map((symptom) => [symptom.id, symptom])),
    [knowledge.symptoms],
  );

  const lowerSearch = searchTerm.trim().toLowerCase();

  const filteredRules = useMemo(() => {
    if (!lowerSearch) return knowledge.rules || [];
    return (knowledge.rules || []).filter((rule) => {
      const disease = diseaseById[rule.then];
      return [
        rule.rule_id,
        rule.then,
        disease?.name,
        ...(rule.if || []),
      ].some((value) => String(value || '').toLowerCase().includes(lowerSearch));
    });
  }, [knowledge.rules, diseaseById, lowerSearch]);

  const filteredDiseases = useMemo(() => {
    if (!lowerSearch) return knowledge.diseases || [];
    return (knowledge.diseases || []).filter((disease) =>
      [disease.id, disease.name, disease.group, disease.hallmark, disease.treatment]
        .some((value) => String(value || '').toLowerCase().includes(lowerSearch)),
    );
  }, [knowledge.diseases, lowerSearch]);

  const filteredSymptoms = useMemo(() => {
    if (!lowerSearch) return knowledge.symptoms || [];
    return (knowledge.symptoms || []).filter((symptom) =>
      [symptom.id, symptom.question].some((value) => String(value || '').toLowerCase().includes(lowerSearch)),
    );
  }, [knowledge.symptoms, lowerSearch]);

  const handleStatus = (message) => {
    setStatusMessage(message);
    setErrorMessage('');
  };

  const handleError = (error) => {
    setErrorMessage(normalizeError(error));
    setStatusMessage('');
  };

  const handleRuleFormChange = (event) => {
    const { name, value } = event.target;
    setRuleForm((current) => ({ ...current, [name]: value }));
  };

  const handleSymptomFormChange = (event) => {
    const { name, value } = event.target;
    setSymptomForm((current) => ({ ...current, [name]: value }));
  };

  const handleDiseaseFormChange = (event) => {
    const { name, value } = event.target;
    setDiseaseForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveRule = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const payload = toRulePayload(ruleForm);
      await saveKnowledgeRule(payload);
      await refreshKnowledge();
      setRuleForm(emptyRuleForm);
      handleStatus(`Đã lưu luật ${payload.rule_id} vào runtime Prolog.`);
    } catch (error) {
      handleError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSymptom = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await saveKnowledgeSymptom({
        id: symptomForm.id.trim(),
        question: symptomForm.question.trim(),
      });
      await refreshKnowledge();
      setSymptomForm(emptySymptomForm);
      handleStatus(`Đã lưu triệu chứng ${symptomForm.id}.`);
    } catch (error) {
      handleError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDisease = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await saveKnowledgeDisease({
        ...diseaseForm,
        id: diseaseForm.id.trim(),
        name: diseaseForm.name.trim(),
        cf_threshold: Number(diseaseForm.cf_threshold),
      });
      await refreshKnowledge();
      setDiseaseForm(emptyDiseaseForm);
      handleStatus(`Đã lưu bệnh ${diseaseForm.id}.`);
    } catch (error) {
      handleError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditRule = (rule) => {
    setActiveTab('rules');
    setRuleForm({
      rule_id: rule.rule_id,
      if_symptoms: (rule.if || []).join(', '),
      then_disease: rule.then,
      cf: String(rule.cf ?? 0.8),
      priority: String(rule.priority || 2),
    });
    handleStatus(`Đang chỉnh sửa luật ${rule.rule_id}.`);
  };

  const handleEditSymptom = (symptom) => {
    setActiveTab('symptoms');
    setSymptomForm({
      id: symptom.id,
      question: symptom.question,
    });
    handleStatus(`Đang chỉnh sửa triệu chứng ${symptom.id}.`);
  };

  const handleEditDisease = (disease) => {
    setActiveTab('diseases');
    setDiseaseForm({
      id: disease.id,
      name: disease.name || '',
      group: disease.group || 'custom',
      age_focus: disease.age_focus || 'chưa xác định',
      hallmark: disease.hallmark || '',
      cause: disease.cause || '',
      prevention: disease.prevention || '',
      treatment: disease.treatment || '',
      cf_threshold: String(disease.cf_threshold ?? 0.7),
    });
    handleStatus(`Đang chỉnh sửa bệnh ${disease.id}.`);
  };

  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm(`Xóa luật ${ruleId} khỏi runtime Prolog?`)) return;
    try {
      await deleteKnowledgeRule(ruleId);
      await refreshKnowledge();
      handleStatus(`Đã xóa luật ${ruleId}.`);
    } catch (error) {
      handleError(error);
    }
  };

  const handleDeleteSymptom = async (symptomId) => {
    if (!window.confirm(`Xóa triệu chứng ${symptomId}? Các luật đang dùng ID này cần được rà lại.`)) return;
    try {
      await deleteKnowledgeSymptom(symptomId);
      await refreshKnowledge();
      handleStatus(`Đã xóa triệu chứng ${symptomId}.`);
    } catch (error) {
      handleError(error);
    }
  };

  const handleDeleteDisease = async (diseaseId) => {
    if (!window.confirm(`Xóa bệnh ${diseaseId}? Các luật kết luận về bệnh này sẽ không còn trả kết quả.`)) return;
    try {
      await deleteKnowledgeDisease(diseaseId);
      await refreshKnowledge();
      handleStatus(`Đã xóa bệnh ${diseaseId}.`);
    } catch (error) {
      handleError(error);
    }
  };

  const exportJson = JSON.stringify(
    {
      symptoms: knowledge.symptoms,
      diseases: knowledge.diseases,
      rules: knowledge.rules,
      note: 'Export này phản ánh tri thức runtime hiện tại. Muốn lưu vĩnh viễn, đồng bộ lại vào JSON/Prolog.',
    },
    null,
    2,
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 animate-fade-in">
      <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Knowledge Admin</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Quản trị tri thức</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Thêm, chỉnh sửa và xóa tri thức trong runtime Prolog. Sau khi kiểm duyệt, export dữ liệu để đồng bộ vĩnh viễn vào Knowledge Base.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-xl font-extrabold text-emerald-700">{knowledge.symptoms.length}</p>
              <p className="text-[10px] font-bold uppercase text-emerald-600">Triệu chứng</p>
            </div>
            <div className="rounded-2xl bg-blue-50 px-4 py-3">
              <p className="text-xl font-extrabold text-blue-700">{knowledge.diseases.length}</p>
              <p className="text-[10px] font-bold uppercase text-blue-600">Bệnh</p>
            </div>
            <div className="rounded-2xl bg-amber-50 px-4 py-3">
              <p className="text-xl font-extrabold text-amber-700">{knowledge.rules.length}</p>
              <p className="text-[10px] font-bold uppercase text-amber-600">Luật</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[400px_1fr]">
        <aside className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5 xl:sticky xl:top-5 xl:self-start">
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto] xl:grid-cols-1">
            <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Tìm kiếm tri thức</label>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="VD: ASF, sốt, R_Ery..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
            </div>
            <button
              type="button"
              onClick={() => refreshKnowledge().then(() => handleStatus('Đã tải lại tri thức runtime.')).catch(handleError)}
              className="h-12 rounded-2xl border border-slate-200 px-4 text-sm font-extrabold text-slate-700 hover:bg-slate-50 sm:self-end xl:w-full"
            >
              Tải lại
            </button>
          </div>

          <div className="mb-5 grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 p-1">
            {[
              ['rules', 'Luật'],
              ['diseases', 'Bệnh'],
              ['symptoms', 'Triệu chứng'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                  activeTab === id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'rules' && (
            <form onSubmit={handleSaveRule} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold text-slate-800">Thêm / chỉnh sửa luật</h3>
                {ruleForm.rule_id && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">Đang sửa</span>}
              </div>
              <input name="rule_id" value={ruleForm.rule_id} onChange={handleRuleFormChange} placeholder="Mã luật: R_CUSTOM_01" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <input name="if_symptoms" value={ruleForm.if_symptoms} onChange={handleRuleFormChange} placeholder="IF: sym_a, sym_b" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <input name="then_disease" value={ruleForm.then_disease} onChange={handleRuleFormChange} placeholder="THEN: dis_x" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <div className="grid grid-cols-2 gap-2">
                <input name="cf" type="number" min="0" max="1" step="0.01" value={ruleForm.cf} onChange={handleRuleFormChange} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <input name="priority" type="number" min="1" max="3" step="1" value={ruleForm.priority} onChange={handleRuleFormChange} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={isSaving} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:bg-slate-300">
                  Lưu luật
                </button>
                <button type="button" onClick={() => setRuleForm(emptyRuleForm)} className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-300">
                  Mới
                </button>
              </div>
            </form>
          )}

          {activeTab === 'symptoms' && (
            <form onSubmit={handleSaveSymptom} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold text-slate-800">Thêm / chỉnh sửa triệu chứng</h3>
                {symptomForm.id && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">Đang sửa</span>}
              </div>
              <input name="id" value={symptomForm.id} onChange={handleSymptomFormChange} placeholder="ID: sym_custom" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <textarea name="question" value={symptomForm.question} onChange={handleSymptomFormChange} rows={5} placeholder="Câu hỏi triệu chứng..." className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <div className="flex gap-2">
                <button type="submit" disabled={isSaving} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:bg-slate-300">
                  Lưu triệu chứng
                </button>
                <button type="button" onClick={() => setSymptomForm(emptySymptomForm)} className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-300">
                  Mới
                </button>
              </div>
            </form>
          )}

          {activeTab === 'diseases' && (
            <form onSubmit={handleSaveDisease} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold text-slate-800">Thêm / chỉnh sửa bệnh</h3>
                {diseaseForm.id && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">Đang sửa</span>}
              </div>
              <input name="id" value={diseaseForm.id} onChange={handleDiseaseFormChange} placeholder="ID: dis_custom" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <input name="name" value={diseaseForm.name} onChange={handleDiseaseFormChange} placeholder="Tên bệnh" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <div className="grid grid-cols-2 gap-2">
                <input name="group" value={diseaseForm.group} onChange={handleDiseaseFormChange} placeholder="Nhóm bệnh" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                <input name="cf_threshold" type="number" min="0" max="1" step="0.01" value={diseaseForm.cf_threshold} onChange={handleDiseaseFormChange} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              </div>
              <input name="age_focus" value={diseaseForm.age_focus} onChange={handleDiseaseFormChange} placeholder="Nhóm tuổi / đối tượng" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <textarea name="hallmark" value={diseaseForm.hallmark} onChange={handleDiseaseFormChange} rows={2} placeholder="Dấu hiệu điển hình" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <textarea name="cause" value={diseaseForm.cause} onChange={handleDiseaseFormChange} rows={2} placeholder="Nguyên nhân" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <textarea name="prevention" value={diseaseForm.prevention} onChange={handleDiseaseFormChange} rows={2} placeholder="Phòng ngừa" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <textarea name="treatment" value={diseaseForm.treatment} onChange={handleDiseaseFormChange} rows={3} placeholder="Điều trị" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <div className="flex gap-2">
                <button type="submit" disabled={isSaving} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700 disabled:bg-slate-300">
                  Lưu bệnh
                </button>
                <button type="button" onClick={() => setDiseaseForm(emptyDiseaseForm)} className="rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-extrabold text-slate-700 hover:bg-slate-300">
                  Mới
                </button>
              </div>
            </form>
          )}

          {statusMessage && <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{statusMessage}</div>}
          {errorMessage && <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{errorMessage}</div>}
        </aside>

        <main className="min-w-0 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900">
                {activeTab === 'rules' && `Danh sách luật (${filteredRules.length})`}
                {activeTab === 'diseases' && `Danh sách bệnh (${filteredDiseases.length})`}
                {activeTab === 'symptoms' && `Danh sách triệu chứng (${filteredSymptoms.length})`}
              </h3>
              <p className="text-xs font-medium text-slate-500">Dùng nút Sửa để nạp dữ liệu vào form bên trái.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowExport((current) => !current)}
              className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-slate-800"
            >
              {showExport ? 'Ẩn export' : 'Export JSON'}
            </button>
          </div>

          {activeTab === 'rules' && (
            <div className="grid gap-3 p-4 lg:grid-cols-2">
              {filteredRules.map((rule) => (
                <article key={rule.rule_id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="max-w-full truncate rounded-full bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white">{rule.rule_id}</span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">CF {rule.cf}</span>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">Priority {rule.priority || 2}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                      <button type="button" onClick={() => handleEditRule(rule)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200">
                        Sửa
                      </button>
                      <button type="button" onClick={() => handleDeleteRule(rule.rule_id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100">
                        Xóa
                      </button>
                    </div>
                  </div>
                  <p className="break-words text-sm font-bold text-slate-800">
                    IF {(rule.if || []).join(' + ')} THEN {diseaseById[rule.then]?.name || rule.then}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(rule.if || []).map((symptomId) => (
                      <span key={symptomId} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {symptomById[symptomId]?.question || symptomId}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}

          {activeTab === 'diseases' && (
            <div className="grid gap-3 p-4 lg:grid-cols-2">
              {filteredDiseases.map((disease) => (
                <article key={disease.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-all font-mono text-[11px] font-bold text-emerald-600">{disease.id}</p>
                      <h3 className="mt-1 break-words font-extrabold text-slate-900">{disease.name}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                      <button type="button" onClick={() => handleEditDisease(disease)} className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100">Sửa</button>
                      <button type="button" onClick={() => handleDeleteDisease(disease.id)} className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100">Xóa</button>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-500">{disease.group} · threshold {disease.cf_threshold}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{disease.hallmark}</p>
                </article>
              ))}
            </div>
          )}

          {activeTab === 'symptoms' && (
            <div className="grid gap-3 p-4 lg:grid-cols-2">
              {filteredSymptoms.map((symptom) => (
                <article key={symptom.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <p className="break-all font-mono text-[11px] font-bold text-emerald-600">{symptom.id}</p>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                      <button type="button" onClick={() => handleEditSymptom(symptom)} className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100">Sửa</button>
                      <button type="button" onClick={() => handleDeleteSymptom(symptom.id)} className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100">Xóa</button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{symptom.question}</p>
                </article>
              ))}
            </div>
          )}

          {showExport && (
            <div className="border-t border-slate-100 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-sm font-extrabold text-slate-800">Export tri thức runtime hiện tại</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">JSON</span>
              </div>
              <pre className="max-h-72 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-100">{exportJson}</pre>
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
