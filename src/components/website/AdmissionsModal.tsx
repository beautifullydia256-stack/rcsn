import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  GraduationCap,
  Calendar,
  User,
  BookOpen,
  FileCheck,
  CheckCircle2,
  Phone,
  Mail,
  Building2,
  Printer,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  Award,
  Upload,
  FileText,
  CreditCard,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';
import { submitAdmissionApplication, type AdmissionApplication, type SubjectGrade } from '@/services/schoolPublicService';

interface AdmissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedProgram?: string;
}

interface SubjectItem {
  subject: string;
  grade: string;
  isCore?: boolean;
}

const DEFAULT_SUBJECTS: SubjectItem[] = [
  { subject: 'Biology', grade: 'C3', isCore: true },
  { subject: 'Chemistry', grade: 'C4', isCore: true },
  { subject: 'Physics', grade: 'P7', isCore: true },
  { subject: 'Mathematics', grade: 'P7', isCore: true },
  { subject: 'English', grade: 'C4', isCore: true },
  { subject: 'Agriculture', grade: 'C4', isCore: false },
  { subject: 'Geography', grade: 'C5', isCore: false },
];

const GRADE_OPTIONS = [
  { value: 'D1', label: 'D1 (Distinction 1)' },
  { value: 'D2', label: 'D2 (Distinction 2)' },
  { value: 'C3', label: 'C3 (Credit 3)' },
  { value: 'C4', label: 'C4 (Credit 4)' },
  { value: 'C5', label: 'C5 (Credit 5)' },
  { value: 'C6', label: 'C6 (Credit 6)' },
  { value: 'P7', label: 'P7 (Pass 7)' },
  { value: 'P8', label: 'P8 (Pass 8)' },
  { value: 'F9', label: 'F9 (Fail 9)' },
  { value: 'A', label: 'Principal A (UACE)' },
  { value: 'B', label: 'Principal B (UACE)' },
  { value: 'C', label: 'Principal C (UACE)' },
  { value: 'D', label: 'Principal D (UACE)' },
  { value: 'E', label: 'Principal E (UACE)' },
  { value: 'O', label: 'Subsidiary O (UACE)' },
];

export default function AdmissionsModal({ isOpen, onClose, preselectedProgram }: AdmissionsModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<AdmissionApplication | null>(null);

  // Form State - Multi-Program Support
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(
    preselectedProgram ? [preselectedProgram] : ['Certificate in Nursing']
  );
  const [intake, setIntake] = useState('August/September 2026 Intake');

  const toggleProgram = (progName: string) => {
    if (selectedPrograms.includes(progName)) {
      if (selectedPrograms.length > 1) {
        setSelectedPrograms(selectedPrograms.filter((p) => p !== progName));
      }
    } else {
      setSelectedPrograms([...selectedPrograms, progName]);
    }
  };

  // Step 2: Personal Details
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'Female' | 'Male'>('Female');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [ninOrId, setNinOrId] = useState('');

  // Step 3: Academic Details & Grades
  const [previousSchool, setPreviousSchool] = useState('');
  const [indexNumber, setIndexNumber] = useState('');
  const [subjects, setSubjects] = useState<SubjectItem[]>(DEFAULT_SUBJECTS);
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [qualificationsSummary, setQualificationsSummary] = useState('');

  // Document Attachment
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFileName, setAttachedFileName] = useState('');
  const [attachedFileSize, setAttachedFileSize] = useState('');
  const [attachedFileData, setAttachedFileData] = useState('');
  const [attachmentError, setAttachmentError] = useState('');

  // Application Fee (UGX 50,000)
  const APPLICATION_FEE_UGX = 50000;
  const [paymentMethod, setPaymentMethod] = useState<'SchoolPay' | 'MTN Mobile Money' | 'Airtel Money' | 'Bank Deposit'>('SchoolPay');
  const [paymentReference, setPaymentReference] = useState('');

  // Sponsor / Guardian Details
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  const programs = [
    { name: 'Certificate in Nursing', duration: '2.5 Years', entry: 'UCE Science Passes' },
    { name: 'Certificate in Midwifery', duration: '2.5 Years', entry: 'UCE Science Passes' },
    { name: 'Certificate in Comprehensive Nursing', duration: '2.5 Years', entry: 'UCE Science Passes' },
    { name: 'Diploma in Nursing (Direct)', duration: '3 Years', entry: 'UACE Principal in Biology' },
    { name: 'Diploma in Midwifery (Direct)', duration: '3 Years', entry: 'UACE Principal in Biology' },
    { name: 'Diploma in Nursing / Midwifery (Extension)', duration: '1.5 Years', entry: 'UNMC Registration & 2 Yrs Practice' },
  ];

  const handleSubjectGradeChange = (index: number, newGrade: string) => {
    setSubjects((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], grade: newGrade };
      return copy;
    });
  };

  const handleAddCustomSubject = () => {
    if (!customSubjectName.trim()) return;
    setSubjects((prev) => [
      ...prev,
      { subject: customSubjectName.trim(), grade: 'C4', isCore: false },
    ]);
    setCustomSubjectName('');
  };

  const handleRemoveSubject = (index: number) => {
    setSubjects((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setAttachmentError('File is too large. Maximum size is 10MB.');
      return;
    }

    setAttachmentError('');
    setAttachedFileName(file.name);
    setAttachedFileSize(`${(file.size / 1024).toFixed(0)} KB`);

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFileData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setAttachedFileName('');
    setAttachedFileSize('');
    setAttachedFileData('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!attachedFileName) {
      setAttachmentError('Please attach a copy or photo of your official UNEB result slip / certificate before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      const subjectGradesPayload: SubjectGrade[] = subjects.map((s) => ({
        subject: s.subject,
        grade: s.grade,
      }));

      const res = await submitAdmissionApplication({
        fullName,
        gender,
        dateOfBirth,
        phone,
        email: email || undefined,
        ninOrId: ninOrId || undefined,
        programs: selectedPrograms,
        program: selectedPrograms[0],
        intake,
        previousSchool,
        indexNumber,
        qualificationsSummary: qualificationsSummary || `Grades submitted: ${subjects.map((s) => `${s.subject}: ${s.grade}`).join(', ')}`,
        subjectGrades: subjectGradesPayload,
        attachedDocumentName: attachedFileName,
        attachedDocumentSize: attachedFileSize,
        attachedDocumentData: attachedFileData || undefined,
        applicationFee: APPLICATION_FEE_UGX,
        paymentMethod,
        paymentReference: paymentReference || `PENDING-PAYMENT-${Date.now().toString().slice(-6)}`,
        guardianName,
        guardianPhone,
      });

      if (res.success) {
        setSubmittedData(res.application);
        setStep(4);
      }
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const resetForm = () => {
    setStep(1);
    setSubmittedData(null);
    setFullName('');
    setPhone('');
    setEmail('');
    setNinOrId('');
    setIndexNumber('');
    setPreviousSchool('');
    setQualificationsSummary('');
    setSubjects(DEFAULT_SUBJECTS);
    setAttachedFileName('');
    setAttachedFileSize('');
    setAttachedFileData('');
    setPaymentReference('');
    setGuardianName('');
    setGuardianPhone('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden z-10 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center p-1 shrink-0">
                  <img
                    src="/images/rcsn/logo.png"
                    alt="RCSN Crest"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                    Rakai Community School of Nursing
                  </h3>
                  <p className="text-xs text-emerald-400 font-semibold">
                    Official Online Application Portal • 2026/2027 Academic Year
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress */}
            {step < 4 && (
              <div className="grid grid-cols-3 gap-2 mt-5 text-xs font-bold text-center">
                <div
                  className={`flex items-center justify-center gap-1.5 pb-2 border-b-2 transition-colors ${
                    step >= 1 ? 'border-emerald-400 text-emerald-300' : 'border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white shrink-0">
                    1
                  </span>
                  <span className="truncate">Programs</span>
                </div>
                <div
                  className={`flex items-center justify-center gap-1.5 pb-2 border-b-2 transition-colors ${
                    step >= 2 ? 'border-emerald-400 text-emerald-300' : 'border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white shrink-0">
                    2
                  </span>
                  <span className="truncate">Personal Info</span>
                </div>
                <div
                  className={`flex items-center justify-center gap-1.5 pb-2 border-b-2 transition-colors ${
                    step >= 3 ? 'border-emerald-400 text-emerald-300' : 'border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white shrink-0">
                    3
                  </span>
                  <span className="truncate">Grades, Files & Fee</span>
                </div>
              </div>
            )}
          </div>

          {/* Form Body */}
          <div className="p-5 sm:p-7 overflow-y-auto flex-1">
            {/* STEP 1: Program Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Select Preferred Intake
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['August/September 2026 Intake', 'January/February 2027 Intake'].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setIntake(i)}
                        className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          intake === i
                            ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200 font-bold shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-sm">{i}</span>
                        {intake === i && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
                    <label className="block text-sm font-bold text-slate-900 dark:text-white">
                      Select Academic Program(s) *
                    </label>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      Select 1, 2, or more courses in order of priority
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {programs.map((p) => {
                      const isSelected = selectedPrograms.includes(p.name);
                      const choiceIndex = selectedPrograms.indexOf(p.name);
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => toggleProgram(p.name)}
                          className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                            isSelected
                              ? 'border-[#00873E] bg-[#00873E]/10 text-slate-900 dark:text-white shadow-sm ring-1 ring-[#00873E]'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-sm font-bold">{p.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00873E] text-white text-[11px] font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Choice {choiceIndex + 1}</span>
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-700 block" />
                              )}
                            </div>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Duration: {p.duration}</span>
                            <span className="font-semibold text-[#00873E] dark:text-emerald-400">{p.entry}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#00873E] hover:bg-[#007033] text-white font-bold text-sm shadow-md transition-colors"
                  >
                    <span>Next: Personal Details</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Personal Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Full Name (As on Academic Documents) *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. NAKATO FLORENCE"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Gender *
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as 'Female' | 'Male')}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Primary Telephone (WhatsApp) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +256 772 123456"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. applicant@gmail.com"
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    National Identification Number (NIN) or Birth Certificate No.
                  </label>
                  <input
                    type="text"
                    value={ninOrId}
                    onChange={(e) => setNinOrId(e.target.value)}
                    placeholder="e.g. CF980000000000"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="pt-4 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    disabled={!fullName.trim() || !phone.trim()}
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#00873E] hover:bg-[#007033] disabled:opacity-50 text-white font-bold text-sm shadow transition-all"
                  >
                    <span>Next: Grades & Document Upload</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Academic Grades Table, Document Upload & UGX 50,000 Fee */}
            {step === 3 && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* School Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Previous School Attended *
                    </label>
                    <input
                      type="text"
                      required
                      value={previousSchool}
                      onChange={(e) => setPreviousSchool(e.target.value)}
                      placeholder="e.g. Masaka Secondary School"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      UCE / UACE / Registration Index No. *
                    </label>
                    <input
                      type="text"
                      required
                      value={indexNumber}
                      onChange={(e) => setIndexNumber(e.target.value)}
                      placeholder="e.g. U0053/045"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 1. SUBJECTS & GRADES ENTRY LIST */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#00873E]" />
                        <span>Academic Subject Grades Breakdown *</span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Select the exact grade obtained in each subject from your UNEB or previous academic result slip.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 self-start sm:self-auto">
                      Science Passes Checked
                    </span>
                  </div>

                  {/* Subject Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {subjects.map((item, idx) => (
                      <div
                        key={item.subject}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-sm"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                            {item.subject}
                          </span>
                          {item.isCore ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                              Core Requirement
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 uppercase">
                              Elective
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={item.grade}
                            onChange={(e) => handleSubjectGradeChange(idx, e.target.value)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00873E] focus:outline-none"
                          >
                            {GRADE_OPTIONS.map((g) => (
                              <option key={g.value} value={g.value}>
                                {g.label}
                              </option>
                            ))}
                          </select>

                          {!item.isCore && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSubject(idx)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded"
                              title="Remove Subject"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Optional Subject Line */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <input
                      type="text"
                      value={customSubjectName}
                      onChange={(e) => setCustomSubjectName(e.target.value)}
                      placeholder="Add another subject (e.g. Commerce, History)..."
                      className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSubject}
                      disabled={!customSubjectName.trim()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-[#00873E] hover:text-white disabled:opacity-50 text-xs font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Subject</span>
                    </button>
                  </div>
                </div>

                {/* 2. ATTACH RESULTS DOCUMENT */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Upload className="w-4 h-4 text-[#00873E]" />
                      <span>Attach UNEB Result Slip / Academic Document *</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Upload an official scanned PDF or clear photograph of your result slip (Max size: 10MB).
                    </p>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg"
                    onChange={handleFileChange}
                    className="hidden"
                    id="admission-result-file"
                  />

                  {attachedFileName ? (
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                            {attachedFileName}
                          </span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            {attachedFileSize} • Ready for Submission
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 text-xs font-bold transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="admission-result-file"
                      className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl hover:border-[#00873E] dark:hover:border-emerald-500 cursor-pointer bg-white dark:bg-slate-900 transition-colors text-center"
                    >
                      <Upload className="w-7 h-7 text-slate-400 mb-2" />
                      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                        Click to Browse or Drag Result Slip Document Here
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Accepts PDF, JPG, PNG (Max 10MB)
                      </span>
                    </label>
                  )}

                  {attachmentError && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{attachmentError}</span>
                    </p>
                  )}
                </div>

                {/* 3. APPLICATION FEE SECTION (UGX 50,000) */}
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-slate-800/80 border-2 border-amber-300 dark:border-amber-700/60 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-amber-800 dark:text-amber-300">
                        Official Application Fee
                      </span>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <span>UGX 50,000 Processing Fee</span>
                      </h4>
                    </div>
                    <span className="text-sm font-black px-3 py-1 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40 self-start sm:self-auto">
                      UGX 50,000 Fixed
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    A non-refundable application processing fee of <strong className="text-slate-900 dark:text-white">UGX 50,000</strong> is
                    payable to complete your registration and book your oral interview date.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Select Payment Channel *
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00873E] focus:outline-none"
                      >
                        <option value="SchoolPay">SchoolPay (MTN MoMo / Airtel Money)</option>
                        <option value="MTN Mobile Money">Direct MTN Mobile Money</option>
                        <option value="Airtel Money">Direct Airtel Money</option>
                        <option value="Bank Deposit">Bank Direct Deposit (Centenary / Stanbic)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Mobile No. or Bank Ref / Transaction ID
                      </label>
                      <input
                        type="text"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="e.g. MTN MoMo Txn ID or Phone No."
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00873E] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. SPONSOR / GUARDIAN INFORMATION */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Parent / Guardian / Sponsor Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Sponsor / Guardian Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="e.g. Mr. Ssekandi Joseph"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                        Sponsor Telephone *
                      </label>
                      <input
                        type="tel"
                        required
                        value={guardianPhone}
                        onChange={(e) => setGuardianPhone(e.target.value)}
                        placeholder="e.g. +256 782 000000"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || !previousSchool || !indexNumber || !guardianName || !attachedFileName}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#00873E] hover:bg-[#007033] disabled:opacity-50 text-white font-black text-sm shadow-xl transition-all"
                  >
                    {isSubmitting ? (
                      <span>Submitting Application...</span>
                    ) : (
                      <>
                        <FileCheck className="w-5 h-5" />
                        <span>Submit Official Application (UGX 50,000)</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Official Application Receipt & Confirmation */}
            {step === 4 && submittedData && (
              <div className="space-y-6 text-center py-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                    Application Received & Logged
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    Congratulations, {submittedData.fullName}!
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1">
                    Your application for admission to Rakai Community School of Nursing has been recorded with all subject grades, attached document, and UGX 50,000 fee acknowledgment.
                  </p>
                </div>

                {/* Printable Receipt Card */}
                <div className="bg-slate-50 dark:bg-slate-800/80 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 text-left max-w-lg mx-auto text-xs space-y-3.5 shadow-sm">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-700 font-bold">
                    <span className="text-slate-500 uppercase tracking-wider text-[11px]">Official Reference No.</span>
                    <span className="text-emerald-700 dark:text-emerald-400 text-base font-black">
                      {submittedData.id}
                    </span>
                  </div>

                  <div className="flex justify-between items-start">
                    <span className="text-slate-500">Applied Program(s):</span>
                    <div className="text-right space-y-0.5">
                      {(submittedData.programs || [submittedData.program]).map((prog, idx) => (
                        <div key={idx} className="font-semibold text-slate-900 dark:text-white text-xs">
                          <span className="text-[#00873E] font-bold mr-1">Choice {idx + 1}:</span>
                          {prog}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Intake Session:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{submittedData.intake}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Candidate Index No:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{submittedData.indexNumber}</span>
                  </div>

                  {/* Submitted Subject Grades */}
                  {submittedData.subjectGrades && submittedData.subjectGrades.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-slate-500 font-bold block mb-1.5 uppercase text-[10px] tracking-wider">
                        Submitted Academic Grades:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {submittedData.subjectGrades.map((sg, i) => (
                          <div key={i} className="flex justify-between p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{sg.subject}</span>
                            <span className="font-bold text-[#00873E] dark:text-emerald-400">{sg.grade}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attached Document Status */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-slate-500">Attached Result Slip:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{submittedData.attachedDocumentName || 'Attached Document Verified'}</span>
                    </span>
                  </div>

                  {/* Application Fee */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-slate-500">Application Processing Fee:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      UGX 50,000 ({submittedData.paymentMethod || 'SchoolPay'})
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Reference:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{submittedData.paymentReference}</span>
                  </div>

                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Status:</span>
                    <span className="inline-block px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-[11px]">
                      {submittedData.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow hover:bg-slate-800 transition-colors w-full sm:w-auto justify-center"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Application Acknowledgment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto justify-center"
                  >
                    <span>Close Window</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
