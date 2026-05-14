import React, { useEffect, useMemo, useState } from 'react';
import { getKnowledgeBase } from '../api';
import { diseaseCatalog, rules as fallbackRules, symptomCatalog } from '../data/knowledge';

const DRAFT_RULES_KEY = 'pig_knowledge_admin_draft_rules';

function loadDraftRules() {
  try {
    const raw = localStorage.getItem(DRAFT_RULES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveDraftRules(rules) {
  localStorage.setItem(DRAFT_RULES_KEY, JSON.stringify(rules));
}

export default function KnowledgeAdminPage() {
  const [knowledge, setKnowledge] = useState({
    symptoms: symptomCatalog,
    diseases: diseaseCatalog,
    rules: fallbackRules,
    metadata: {},
  });
  const [draftRules, setDraftRules] = useState(() => loadDraftRules());
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('rules');
  const [form, setForm] = useState({
    rule_id: '',
    if_symptoms: '',
    then_disease: '',
    cf: '0.8',
    priority: '2',
  });
  const [statusMessage, setStatusMessage] = useState('');

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

  const allRules = useMemo(
    () => [...(knowledge.rules || []), ...draftRules.map((rule) => ({ ...rule, isDraft: true }))],
    [knowledge.rules, draftRules],
  );

  const lowerSearch = searchTerm.trim().toLowerCase();

  const filteredRules = useMemo(() => {
    if (!lowerSearch) return allRules;
    return allRules.filter((rule) => {
      const disease = diseaseById[rule.then];
      return [
        rule.rule_id,
        rule.then,
        disease?.name,
        ...(rule.if || []),
      ].some((value) => String(value || '').toLowerCase().includes(lowerSearch));
    });
  }, [allRules, diseaseById, lowerSearch]);

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

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveDraftRule = (event) => {
    event.preventDefault();
    const ruleId = form.rule_id.trim();
    const symptoms = form.if_symptoms
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const thenDisease = form.then_disease.trim();
    const cf = Number(form.cf);
    const priority = Number(form.priority);

    if (!ruleId || symptoms.length === 0 || !thenDisease || Number.isNaN(cf) || Number.isNaN(priority)) {
      setStatusMessage('Vui lòng nhập đủ mã luật, triệu chứng, bệnh, CF và priority.');
      return;
    }

    const nextRule = {
      rule_id: ruleId,
      if: symptoms,
      then: thenDisease,
      cf: Math.max(0, Math.min(1, cf)),
      priority: Math.max(1, Math.min(3, priority)),
    };
    const nextDraftRules = [
      nextRule,
      ...draftRules.filter((rule) => rule.rule_id !== ruleId),
    ];
    setDraftRules(nextDraftRules);
    saveDraftRules(nextDraftRules);
    setStatusMessage(`Đã lưu luật bản nháp ${ruleId}.`);
    setForm({ rule_id: '', if_symptoms: '', then_disease: '', cf: '0.8', priority: '2' });
  };

  const handleDeleteDraftRule = (ruleId) => {
    const nextDraftRules = draftRules.filter((rule) => rule.rule_id !== ruleId);
    setDraftRules(nextDraftRules);
    saveDraftRules(nextDraftRules);
    setStatusMessage(`Đã xóa luật bản nháp ${ruleId}.`);
  };

  const exportDraftJson = JSON.stringify({ draft_rules: draftRules }, null, 2);

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Knowledge Admin</p>
            <h2 className="mt-1 text-2xl font-extrabold text-slate-900">Quản trị tri thức</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Xem cơ sở tri thức, rà luật IF-THEN và tạo luật bản nháp để nhóm duyệt trước khi đồng bộ vào Prolog.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-emerald-50 px-4 py-3">
              <p className="text-xl font-extrabold text-emerald-700">{knowledge.symptoms.length}</p>
              <p className="text-[10px] font-bold uppercase text-emerald-600">Triệu chứng</p>
            </div>
            <div className="rounded-2xl bg-blue-50 px-4 py-3">
              <p className="text-xl font-extrabold text-blue-700">{knowledge.diseases.length}</p>
              <p className="text-[10px] font-bold uppercase text-blue-600">Bệnh</p>
            </div>
            <div className="rounded-2xl bg-amber-50 px-4 py-3">
              <p className="text-xl font-extrabold text-amber-700">{allRules.length}</p>
              <p className="text-[10px] font-bold uppercase text-amber-600">Luật</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Tìm kiếm tri thức</label>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="VD: ASF, sốt, R_Ery..."
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div className="mb-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
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

          <form onSubmit={handleSaveDraftRule} className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <h3 className="text-sm font-extrabold text-slate-800">Tạo / sửa luật bản nháp</h3>
            <input name="rule_id" value={form.rule_id} onChange={handleFormChange} placeholder="Mã luật: R_CUSTOM_01" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            <input name="if_symptoms" value={form.if_symptoms} onChange={handleFormChange} placeholder="IF: sym_a, sym_b" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            <input name="then_disease" value={form.then_disease} onChange={handleFormChange} placeholder="THEN: dis_x" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            <div className="grid grid-cols-2 gap-2">
              <input name="cf" type="number" min="0" max="1" step="0.01" value={form.cf} onChange={handleFormChange} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
              <input name="priority" type="number" min="1" max="3" step="1" value={form.priority} onChange={handleFormChange} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
            </div>
            <button type="submit" className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-extrabold text-white hover:bg-emerald-700">
              Lưu luật bản nháp
            </button>
            {statusMessage && <p className="text-xs font-semibold text-slate-500">{statusMessage}</p>}
          </form>
        </aside>

        <main className="rounded-3xl border border-slate-100 bg-white shadow-sm">
          {activeTab === 'rules' && (
            <div className="divide-y divide-slate-50">
              {filteredRules.map((rule) => (
                <div key={`${rule.rule_id}-${rule.isDraft ? 'draft' : 'base'}`} className="p-5">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-900 px-2.5 py-1 font-mono text-xs font-bold text-white">{rule.rule_id}</span>
                      {rule.isDraft && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">Bản nháp</span>}
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">CF {rule.cf}</span>
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">Priority {rule.priority || 2}</span>
                    </div>
                    {rule.isDraft && (
                      <button type="button" onClick={() => handleDeleteDraftRule(rule.rule_id)} className="text-xs font-bold text-rose-500 hover:text-rose-600">
                        Xóa bản nháp
                      </button>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-800">
                    IF {(rule.if || []).join(' + ')} THEN {diseaseById[rule.then]?.name || rule.then}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(rule.if || []).map((symptomId) => (
                      <span key={symptomId} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {symptomById[symptomId]?.question || symptomId}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'diseases' && (
            <div className="grid gap-3 p-5 md:grid-cols-2">
              {filteredDiseases.map((disease) => (
                <article key={disease.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="font-mono text-[11px] font-bold text-emerald-600">{disease.id}</p>
                  <h3 className="mt-1 font-extrabold text-slate-900">{disease.name}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{disease.group} · threshold {disease.cf_threshold}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{disease.hallmark}</p>
                </article>
              ))}
            </div>
          )}

          {activeTab === 'symptoms' && (
            <div className="grid gap-3 p-5 md:grid-cols-2">
              {filteredSymptoms.map((symptom) => (
                <article key={symptom.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="font-mono text-[11px] font-bold text-emerald-600">{symptom.id}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{symptom.question}</p>
                </article>
              ))}
            </div>
          )}

          <div className="border-t border-slate-100 p-5">
            <h3 className="mb-2 text-sm font-extrabold text-slate-800">Export luật bản nháp</h3>
            <pre className="max-h-48 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-emerald-100">{exportDraftJson}</pre>
          </div>
        </main>
      </section>
    </div>
  );
}
