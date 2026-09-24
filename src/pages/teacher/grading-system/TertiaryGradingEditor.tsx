import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stethoscope,
  Award,
  CheckCircle2,
  Percent,
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Loader2,
  Sliders,
  AlertCircle,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  TertiaryGradeBand,
  TertiaryAssessmentScheme,
  DEFAULT_TERTIARY_GRADE_BANDS,
  DEFAULT_TERTIARY_SCHEME,
  fetchTertiaryGradingBands,
  saveTertiaryGradingBands,
  fetchTertiaryAssessmentScheme,
  saveTertiaryAssessmentScheme,
  calculateTertiaryMarkRow,
} from '@/features/tertiary/services/tertiaryAssessmentService';

export function TertiaryGradingScaleEditor({ schoolId }: { schoolId: string }) {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const queryClient = useQueryClient();

  const [bands, setBands] = useState<TertiaryGradeBand[]>(DEFAULT_TERTIARY_GRADE_BANDS);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: serverBands, isLoading } = useQuery({
    queryKey: ['tertiary', 'grading-bands', schoolId],
    queryFn: () => fetchTertiaryGradingBands(schoolId),
    enabled: !!schoolId,
  });

  useEffect(() => {
    if (serverBands && serverBands.length > 0) {
      setBands(serverBands);
    }
  }, [serverBands]);

  const saveMutation = useMutation({
    mutationFn: async (updatedBands: TertiaryGradeBand[]) => {
      await saveTertiaryGradingBands(schoolId, updatedBands);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tertiary', 'grading-bands', schoolId] });
      setSuccessMessage('UNMEB grading scale successfully saved.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to save grading scale.');
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const handleBandChange = (
    index: number,
    field: keyof TertiaryGradeBand,
    value: string | number
  ) => {
    setBands((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: typeof next[index][field] === 'number' ? Number(value) : value,
      };
      return next;
    });
  };

  const handleAddBand = () => {
    setBands((prev) => [
      ...prev,
      {
        grade: 'NEW',
        min_pct: 0,
        max_pct: 49.99,
        gp: 0.0,
        remark: 'Pass',
      },
    ]);
  };

  const handleRemoveBand = (index: number) => {
    setBands((prev) => prev.filter((_, i) => i !== index));
  };

  const handleResetDefaults = () => {
    setBands(DEFAULT_TERTIARY_GRADE_BANDS);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: t.textMuted }}>
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="text-sm font-semibold">Loading tertiary grading scale…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div
        className="rounded-2xl p-6 border transition-all space-y-4"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}
            >
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
                UNMEB & Health Science Grading Scale (5.0 Scale)
              </h2>
              <p className="text-xs font-medium mt-0.5" style={{ color: t.textMuted }}>
                Standard grading scheme for higher institutions, nursing, and health sciences. Pass mark is strictly 50.0%.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-1.5 rounded-xl border text-xs font-semibold active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset UNMEB Defaults</span>
            </button>

            <button
              type="button"
              onClick={() => saveMutation.mutate(bands)}
              disabled={saveMutation.isPending}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              style={{ background: t.brandBlue }}
            >
              {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Editable Bands Table */}
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: t.border }}>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b" style={{ background: t.surface, borderColor: t.border }}>
                <th className="p-3.5 font-bold uppercase tracking-wider w-24" style={{ color: t.textMuted }}>Grade Code</th>
                <th className="p-3.5 font-bold uppercase tracking-wider w-28" style={{ color: t.textMuted }}>Min %</th>
                <th className="p-3.5 font-bold uppercase tracking-wider w-28" style={{ color: t.textMuted }}>Max %</th>
                <th className="p-3.5 font-bold uppercase tracking-wider w-28" style={{ color: t.textMuted }}>Grade Point (GP)</th>
                <th className="p-3.5 font-bold uppercase tracking-wider" style={{ color: t.textMuted }}>Academic Standing / Remark</th>
                <th className="p-3.5 font-bold uppercase tracking-wider w-20 text-center" style={{ color: t.textMuted }}>Status</th>
                <th className="p-3.5 font-bold uppercase tracking-wider w-16 text-center" style={{ color: t.textMuted }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: t.border }}>
              {bands.map((b, idx) => {
                const isFail = b.gp < 2.0 || b.min_pct < 50;
                return (
                  <tr key={idx} className="transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                    {/* Grade Code */}
                    <td className="p-3">
                      <input
                        type="text"
                        value={b.grade}
                        onChange={(e) => handleBandChange(idx, 'grade', e.target.value.toUpperCase())}
                        className="w-16 px-2 py-1 rounded-lg border font-mono font-bold text-center outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
                      />
                    </td>

                    {/* Min % */}
                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={b.min_pct}
                        onChange={(e) => handleBandChange(idx, 'min_pct', e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg border font-mono font-semibold text-center outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
                      />
                    </td>

                    {/* Max % */}
                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={b.max_pct}
                        onChange={(e) => handleBandChange(idx, 'max_pct', e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg border font-mono font-semibold text-center outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
                      />
                    </td>

                    {/* Grade Point */}
                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        max={5}
                        step="0.1"
                        value={b.gp}
                        onChange={(e) => handleBandChange(idx, 'gp', e.target.value)}
                        className="w-20 px-2 py-1 rounded-lg border font-mono font-black text-center outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
                      />
                    </td>

                    {/* Remark */}
                    <td className="p-3">
                      <input
                        type="text"
                        value={b.remark}
                        onChange={(e) => handleBandChange(idx, 'remark', e.target.value)}
                        className="w-full px-2.5 py-1 rounded-lg border font-medium outline-none focus:ring-1 focus:ring-blue-500"
                        style={{ background: t.card, borderColor: t.border, color: t.textPrimary }}
                      />
                    </td>

                    {/* Status Badge */}
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isFail
                            ? 'bg-rose-500/15 text-rose-500 border-rose-500/30'
                            : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                        }`}
                      >
                        {isFail ? 'Retake' : 'Pass'}
                      </span>
                    </td>

                    {/* Delete Action */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveBand(idx)}
                        disabled={bands.length <= 1}
                        className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors disabled:opacity-30 cursor-pointer"
                        title="Delete band"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-start">
          <button
            type="button"
            onClick={handleAddBand}
            className="px-3.5 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm"
            style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
          >
            <Plus className="w-3.5 h-3.5 text-blue-500" />
            <span>Add Custom Grade Band</span>
          </button>
        </div>
      </div>

      {/* Graduation CGPA Reference & Standards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="rounded-2xl p-6 border transition-all shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>
              CGPA Classification (5.0 Scale)
            </h3>
          </div>
          <ul className="text-xs space-y-2.5" style={{ color: t.textMuted }}>
            <li className="flex justify-between py-1.5 border-b" style={{ borderColor: t.border }}>
              <span>Class I (Distinction):</span>
              <span className="font-mono font-bold text-emerald-500">4.40 – 5.00</span>
            </li>
            <li className="flex justify-between py-1.5 border-b" style={{ borderColor: t.border }}>
              <span>Class II Upper (Credit):</span>
              <span className="font-mono font-bold text-blue-500">3.60 – 4.39</span>
            </li>
            <li className="flex justify-between py-1.5 border-b" style={{ borderColor: t.border }}>
              <span>Class II Lower (Pass):</span>
              <span className="font-mono font-bold text-amber-500">2.80 – 3.59</span>
            </li>
            <li className="flex justify-between py-1.5">
              <span>Pass:</span>
              <span className="font-mono font-bold" style={{ color: t.textPrimary }}>2.00 – 2.79</span>
            </li>
          </ul>
        </div>

        <div
          className="rounded-2xl p-6 border transition-all shadow-sm"
          style={{ background: t.card, borderColor: t.border }}
        >
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold" style={{ color: t.textPrimary }}>
              UNMEB Statutory Examination Rules
            </h3>
          </div>
          <ul className="text-xs space-y-2.5" style={{ color: t.textMuted }}>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span>Minimum 75% attendance in theory lectures and clinical demonstrations.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span>100% completion of hospital ward rotation hours with signed clinical logbooks.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span>Continuous Assessment (CAT) score of at least 50% to be eligible for final exams.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span>Any overall mark below 50.0% constitutes an automatic course unit Retake.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function TertiaryAssessmentWeightsEditor({ schoolId }: { schoolId: string }) {
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);
  const queryClient = useQueryClient();

  const [scheme, setScheme] = useState<TertiaryAssessmentScheme>(DEFAULT_TERTIARY_SCHEME);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Live calculator test state
  const [calcTest1, setCalcTest1] = useState<number>(75);
  const [calcTest2, setCalcTest2] = useState<number>(85);
  const [calcExam, setCalcExam] = useState<number>(70);

  const { data: serverScheme, isLoading } = useQuery({
    queryKey: ['tertiary', 'assessment-scheme', schoolId],
    queryFn: () => fetchTertiaryAssessmentScheme(schoolId),
    enabled: !!schoolId,
  });

  useEffect(() => {
    if (serverScheme) {
      setScheme(serverScheme);
    }
  }, [serverScheme]);

  const saveMutation = useMutation({
    mutationFn: async (updatedScheme: TertiaryAssessmentScheme) => {
      await saveTertiaryAssessmentScheme(schoolId, updatedScheme);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tertiary', 'assessment-scheme', schoolId] });
      setSuccessMessage('Assessment weights successfully saved.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  const previewResult = calculateTertiaryMarkRow(
    calcTest1,
    calcTest2,
    calcExam,
    DEFAULT_TERTIARY_GRADE_BANDS,
    scheme
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ color: t.textMuted }}>
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="text-sm font-semibold">Loading assessment weights…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-6 border transition-all space-y-6 shadow-sm"
        style={{ background: t.card, borderColor: t.border }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(59, 130, 246, 0.12)', color: t.brandBlue }}
            >
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: t.textPrimary }}>
                Continuous Assessment (CAT) & Examination Weights
              </h2>
              <p className="text-xs font-medium mt-0.5" style={{ color: t.textMuted }}>
                Configure statutory coursework and end-of-semester examination weighting for all course units.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScheme(DEFAULT_TERTIARY_SCHEME)}
              className="px-3 py-1.5 rounded-xl border text-xs font-semibold active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm"
              style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset 30% / 70% Default</span>
            </button>

            <button
              type="button"
              onClick={() => saveMutation.mutate(scheme)}
              disabled={saveMutation.isPending}
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              style={{ background: t.brandBlue }}
            >
              {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Weights</span>
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span>Continuous Assessment (CAT) Weight</span>
                <span className="font-mono text-blue-500 font-black text-sm">{scheme.catWeight}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={50}
                step={5}
                value={scheme.catWeight}
                onChange={(e) => {
                  const cat = Number(e.target.value);
                  setScheme((prev) => ({ ...prev, catWeight: cat, examWeight: 100 - cat }));
                }}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <p className="text-[11px] mt-1" style={{ color: t.textMuted }}>
                Covers progressive tests, skills laboratory OSCE practicals, and clinical logbook evaluation.
              </p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1.5">
                <span>Final Semester Examination Weight</span>
                <span className="font-mono text-emerald-500 font-black text-sm">{scheme.examWeight}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={90}
                step={5}
                value={scheme.examWeight}
                onChange={(e) => {
                  const exam = Number(e.target.value);
                  setScheme((prev) => ({ ...prev, examWeight: exam, catWeight: 100 - exam }));
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <p className="text-[11px] mt-1" style={{ color: t.textMuted }}>
                Covers final written theory papers and bedside clinical examinations.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5">
                Minimum Pass Mark Threshold (%)
              </label>
              <input
                type="number"
                min={40}
                max={60}
                step={1}
                value={scheme.passMark}
                onChange={(e) => setScheme((prev) => ({ ...prev, passMark: Number(e.target.value) }))}
                className="w-32 px-3 py-2 rounded-xl text-xs font-mono font-bold border outline-none shadow-inner"
                style={{ background: t.surface, borderColor: t.border, color: t.textPrimary }}
              />
              <p className="text-[11px] mt-1" style={{ color: t.textMuted }}>
                Under national UNMEB health regulations, any score below 50.0% is an automatic retake.
              </p>
            </div>
          </div>

          {/* Real-time Calculation Simulator */}
          <div
            className="p-5 rounded-2xl border space-y-4"
            style={{ background: t.surface, borderColor: t.border }}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: t.textPrimary }}>
                Live Calculation Simulator
              </h3>
            </div>
            <p className="text-[11px]" style={{ color: t.textMuted }}>
              Test how marks are weighted and computed with your active scheme:
            </p>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-[10px] font-bold block mb-1">Test 1 (/100)</span>
                <input
                  type="number"
                  value={calcTest1}
                  onChange={(e) => setCalcTest1(Number(e.target.value))}
                  className="w-full text-center py-1 rounded-lg border font-mono font-bold text-xs"
                  style={{ background: t.card, borderColor: t.border }}
                />
              </div>
              <div>
                <span className="text-[10px] font-bold block mb-1">Test 2 (/100)</span>
                <input
                  type="number"
                  value={calcTest2}
                  onChange={(e) => setCalcTest2(Number(e.target.value))}
                  className="w-full text-center py-1 rounded-lg border font-mono font-bold text-xs"
                  style={{ background: t.card, borderColor: t.border }}
                />
              </div>
              <div>
                <span className="text-[10px] font-bold block mb-1">Exam (/100)</span>
                <input
                  type="number"
                  value={calcExam}
                  onChange={(e) => setCalcExam(Number(e.target.value))}
                  className="w-full text-center py-1 rounded-lg border font-mono font-bold text-xs"
                  style={{ background: t.card, borderColor: t.border }}
                />
              </div>
            </div>

            <div className="pt-3 border-t space-y-2 text-xs" style={{ borderColor: t.border }}>
              <div className="flex justify-between">
                <span>Weighted CAT Score ({scheme.catWeight}%):</span>
                <span className="font-mono font-bold text-blue-500">{previewResult.cat_score?.toFixed(1)} / {scheme.catWeight}</span>
              </div>
              <div className="flex justify-between">
                <span>Composite Final Score (100%):</span>
                <span className="font-mono font-black text-emerald-500 text-sm">{previewResult.final_score?.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Grade & Grade Point (5.0):</span>
                <span className="font-mono font-bold">{previewResult.grade} ({previewResult.grade_point.toFixed(1)} GP)</span>
              </div>
              <div className="flex justify-between">
                <span>Academic Standing:</span>
                <span className={`font-bold ${previewResult.is_retake ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {previewResult.remarks}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
