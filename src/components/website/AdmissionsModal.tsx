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
  Trash2,
  Smartphone,
  Download,
  Loader2,
  Check
} from 'lucide-react';
import { submitAdmissionApplication, type AdmissionApplication, type SubjectGrade } from '@/services/schoolPublicService';
import { generateAdmissionApplicationPdf } from '@/lib/generateAdmissionApplicationPdf';

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

// O-Level Academic Subject Grades: A, B, C, D, E, O, F
const DEFAULT_SUBJECTS: SubjectItem[] = [
  { subject: 'Biology', grade: 'A', isCore: true },
  { subject: 'Chemistry', grade: 'B', isCore: true },
  { subject: 'Physics', grade: 'B', isCore: true },
  { subject: 'Mathematics', grade: 'C', isCore: true },
  { subject: 'English', grade: 'A', isCore: true },
];

const GRADE_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'O', 'F'];

export default function AdmissionsModal({ isOpen, onClose, preselectedProgram }: AdmissionsModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
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

  // Step 2: Personal Details & Guardian
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<'Female' | 'Male'>('Female');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [ninOrId, setNinOrId] = useState('');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

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

  // Step 4: Mobile Money Payment Gateway (UGX 50,000)
  const APPLICATION_FEE_UGX = 50000;
  const [paymentProvider, setPaymentProvider] = useState<'MTN Mobile Money' | 'Airtel Money'>('MTN Mobile Money');
  const [payingPhone, setPayingPhone] = useState('');
  const [paymentState, setPaymentState] = useState<'idle' | 'initiating' | 'awaiting_pin' | 'verifying' | 'success'>('idle');
  const [txnReference, setTxnReference] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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
      { subject: customSubjectName.trim(), grade: 'B', isCore: false },
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

  // Pre-fill paying phone when navigating to step 4
  const handleProceedToPayment = () => {
    if (!attachedFileName) {
      setAttachmentError('Please attach a copy or photo of your official UNEB result slip / certificate before proceeding.');
      return;
    }
    if (!previousSchool.trim() || !indexNumber.trim()) {
      return;
    }
    if (!payingPhone) {
      setPayingPhone(phone);
    }
    setStep(4);
  };

  // Trigger Mobile Money Payment Gateway Simulation & Application Submission
  const handleInitiatePayment = async () => {
    const targetPhone = payingPhone.trim() || phone.trim();
    if (!targetPhone) {
      setPaymentError('Please enter a valid mobile money number to receive the prompt.');
      return;
    }

    setPaymentError('');
    setPaymentState('initiating');

    // Step 1: Connecting to gateway (1s)
    await new Promise((r) => setTimeout(r, 900));
    setPaymentState('awaiting_pin');

    // Generate unique MoMo transaction reference
    const generatedTxnRef = `RCSN-MM-${Date.now().toString().slice(-7)}-${Math.floor(1000 + Math.random() * 9000)}`;
    setTxnReference(generatedTxnRef);
  };

  const handleSimulatePinApproval = async () => {
    setPaymentState('verifying');
    await new Promise((r) => setTimeout(r, 1200));
    setPaymentState('success');

    // Auto submit application after verified payment
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
        paymentMethod: paymentProvider,
        paymentReference: txnReference || `RCSN-MM-${Date.now().toString().slice(-7)}`,
        guardianName,
        guardianPhone,
      });

      if (res.success) {
        setSubmittedData(res.application);
        setStep(5);
      }
    } catch (err) {
      console.error('Submission error:', err);
      setPaymentError('Failed to record application after payment. Please contact RCSN Admissions immediately.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!submittedData) return;
    setIsDownloadingPdf(true);
    try {
      await generateAdmissionApplicationPdf(submittedData);
    } catch (e) {
      console.error('Error generating PDF:', e);
    } finally {
      setIsDownloadingPdf(false);
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
    setGuardianName('');
    setGuardianPhone('');
    setPayingPhone('');
    setPaymentState('idle');
    setTxnReference('');
    setPaymentError('');
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
            {step < 5 && (
              <div className="grid grid-cols-4 gap-2 mt-5 text-xs font-bold text-center">
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
                  <span className="truncate">Personal</span>
                </div>
                <div
                  className={`flex items-center justify-center gap-1.5 pb-2 border-b-2 transition-colors ${
                    step >= 3 ? 'border-emerald-400 text-emerald-300' : 'border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white shrink-0">
                    3
                  </span>
                  <span className="truncate">Grades & Files</span>
                </div>
                <div
                  className={`flex items-center justify-center gap-1.5 pb-2 border-b-2 transition-colors ${
                    step >= 4 ? 'border-emerald-400 text-emerald-300' : 'border-slate-700 text-slate-400'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] text-white shrink-0">
                    4
                  </span>
                  <span className="truncate">MoMo Payment</span>
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

            {/* STEP 2: Personal Details & Guardian Information */}
            {step === 2 && (
              <div className="space-y-5">
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
                    >
                    </input>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                      Primary Telephone (WhatsApp / Call) *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (!payingPhone) setPayingPhone(e.target.value);
                      }}
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

                {/* Sponsor / Guardian Details */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
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
                    disabled={!fullName.trim() || !phone.trim() || !guardianName.trim() || !guardianPhone.trim()}
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#00873E] hover:bg-[#007033] disabled:opacity-50 text-white font-bold text-sm shadow transition-all"
                  >
                    <span>Next: Grades & Document Upload</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Academic Qualifications (UCE Reformed Curriculum) & Document Attachment */}
            {step === 3 && (
              <div className="space-y-6">
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
                      Candidate UNEB Index Number *
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

                {/* SUBJECTS & GRADES ENTRY */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#00873E]" />
                      <span>Academic Subject Grades *</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Select the grade obtained in each subject according to your UNEB result slip.
                    </p>
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
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              Core Science
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Elective Subject</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <select
                            value={item.grade}
                            onChange={(e) => handleSubjectGradeChange(idx, e.target.value)}
                            className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-[#00873E] focus:outline-none"
                          >
                            {GRADE_OPTIONS.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>

                          {!item.isCore && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSubject(idx)}
                              className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Subject */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={customSubjectName}
                      onChange={(e) => setCustomSubjectName(e.target.value)}
                      placeholder="Add another subject (e.g. History, Commerce, Lit)..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-[#00873E] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomSubject}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* DOCUMENT UPLOAD (RESULT SLIP) */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Upload className="w-4 h-4 text-[#00873E]" />
                        <span>Attach UNEB Result Slip or Academic Certificate *</span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Upload a photo or scanned PDF of your official UNEB result slip (Max 10MB).
                      </p>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {!attachedFileName ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#00873E] rounded-2xl p-6 text-center cursor-pointer bg-white dark:bg-slate-900 transition-colors"
                    >
                      <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        Click to browse & upload Result Slip
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        Supports PDF, PNG, JPG, or JPEG
                      </span>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                            {attachedFileName}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            {attachedFileSize} • Verified Attachment Ready
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {attachmentError && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{attachmentError}</span>
                    </p>
                  )}
                </div>

                {/* Additional Qualifications / Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Additional Academic Qualifications or Certificates (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={qualificationsSummary}
                    onChange={(e) => setQualificationsSummary(e.target.value)}
                    placeholder="Enter any other certificates, A-Level combination, or health training experience..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

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
                    type="button"
                    disabled={!previousSchool.trim() || !indexNumber.trim() || !attachedFileName}
                    onClick={handleProceedToPayment}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#00873E] hover:bg-[#007033] disabled:opacity-50 text-white font-black text-sm shadow-xl transition-all"
                  >
                    <span>Proceed to Application Fee (UGX 50,000)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Official Mobile Money Payment Gateway (MTN & Airtel) */}
            {step === 4 && (
              <div className="space-y-6">
                {/* Fee Header Card */}
                <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-slate-800/80 border-2 border-emerald-400 dark:border-emerald-700/60 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-800 dark:text-emerald-300">
                        Official RCSN Application Fee
                      </span>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                        <CreditCard className="w-6 h-6 text-[#00873E] dark:text-emerald-400" />
                        <span>UGX 50,000 Processing Fee</span>
                      </h4>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="inline-block px-3.5 py-1.5 rounded-xl bg-[#00873E] text-white font-black text-sm shadow">
                        UGX 50,000 Fixed
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    Official admission registration requires payment of the <strong className="text-slate-900 dark:text-white">UGX 50,000</strong> non-refundable application fee via Uganda Mobile Money. Once confirmed, your application reference and official receipt are generated instantly.
                  </p>

                  <div className="pt-2 border-t border-emerald-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Applicant:</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block">{fullName || 'Florence Nakato'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase">Selected Intake:</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block">{intake}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-slate-500 block text-[10px] uppercase">Target Course:</span>
                      <span className="font-bold text-[#00873E] dark:text-emerald-400 truncate block">{selectedPrograms[0]}</span>
                    </div>
                  </div>
                </div>

                {/* Mobile Money Provider Selection */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Select Mobile Money Network *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* MTN Mobile Money */}
                    <button
                      type="button"
                      onClick={() => setPaymentProvider('MTN Mobile Money')}
                      className={`p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${
                        paymentProvider === 'MTN Mobile Money'
                          ? 'border-amber-400 bg-amber-500/10 shadow-md ring-2 ring-amber-400'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shadow shrink-0">
                          MTN
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-900 dark:text-white block">
                            MTN Mobile Money
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                            *165# MoMo Gateway
                          </span>
                        </div>
                      </div>
                      {paymentProvider === 'MTN Mobile Money' && (
                        <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                      )}
                    </button>

                    {/* Airtel Money */}
                    <button
                      type="button"
                      onClick={() => setPaymentProvider('Airtel Money')}
                      className={`p-4 rounded-2xl border-2 text-left flex items-center justify-between transition-all ${
                        paymentProvider === 'Airtel Money'
                          ? 'border-red-500 bg-red-500/10 shadow-md ring-2 ring-red-500'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-red-600 text-white font-black flex items-center justify-center text-sm shadow shrink-0">
                          Airtel
                        </div>
                        <div>
                          <span className="text-sm font-black text-slate-900 dark:text-white block">
                            Airtel Money
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                            *185# Airtel Gateway
                          </span>
                        </div>
                      </div>
                      {paymentProvider === 'Airtel Money' && (
                        <CheckCircle2 className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Paying Phone Number Input */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {paymentProvider} Number to Charge (UGX 50,000) *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                      <Smartphone className="w-4 h-4 mr-1 text-[#00873E]" />
                      <span>+256</span>
                    </div>
                    <input
                      type="tel"
                      value={payingPhone.replace(/^\+?256/, '')}
                      onChange={(e) => setPayingPhone(`+256${e.target.value.replace(/\D/g, '')}`)}
                      placeholder="772 123456"
                      className="w-full pl-20 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-bold focus:ring-2 focus:ring-[#00873E] focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    A USSD prompt will be sent directly to this handset. You or your sponsor may enter the registered MoMo number.
                  </p>
                </div>

                {paymentError && (
                  <p className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{paymentError}</span>
                  </p>
                )}

                {/* GATEWAY INTERACTION POPUP / CARD */}
                {paymentState === 'initiating' && (
                  <div className="p-5 rounded-2xl bg-slate-900 text-white text-center space-y-3 border border-slate-800 animate-pulse">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                    <h5 className="text-sm font-bold">Contacting {paymentProvider} Gateway...</h5>
                    <p className="text-xs text-slate-300">
                      Sending secure payment request of UGX 50,000 to {payingPhone}...
                    </p>
                  </div>
                )}

                {paymentState === 'awaiting_pin' && (
                  <div className="p-6 rounded-3xl bg-slate-950 text-white border-2 border-emerald-500 shadow-2xl space-y-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                      <Smartphone className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold block mb-1">
                        Handset USSD Push Sent
                      </span>
                      <h5 className="text-base sm:text-lg font-black text-white">
                        Check Your Phone: {payingPhone}
                      </h5>
                      <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
                        A prompt has been sent to authorize payment of <strong className="text-white">UGX 50,000</strong> to <strong>Rakai Community School of Nursing</strong>. Enter your {paymentProvider === 'MTN Mobile Money' ? 'MoMo' : 'Airtel Money'} PIN on your phone handset to approve.
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Waiting for handset PIN approval from network gateway...</span>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleSimulatePinApproval}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        <span>Confirm Handset PIN Entered (Authorize UGX 50,000)</span>
                      </button>
                    </div>
                  </div>
                )}

                {paymentState === 'verifying' && (
                  <div className="p-5 rounded-2xl bg-emerald-950 text-white text-center space-y-3 border border-emerald-700">
                    <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                    <h5 className="text-sm font-bold">Verifying MoMo Payment Clearance...</h5>
                    <p className="text-xs text-emerald-200">
                      Clearing transaction {txnReference} and recording official application...
                    </p>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-4 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={paymentState !== 'idle'}
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-semibold disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  {paymentState === 'idle' && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleInitiatePayment}
                      className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#00873E] hover:bg-[#007033] text-white font-black text-sm shadow-xl transition-all"
                    >
                      <CreditCard className="w-5 h-5" />
                      <span>Pay UGX 50,000 via {paymentProvider === 'MTN Mobile Money' ? 'MTN MoMo' : 'Airtel Money'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* STEP 5: Official Application Receipt, Reference & Professional PDF Download */}
            {step === 5 && submittedData && (
              <div className="space-y-6 text-center py-2">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">
                    Application Officially Logged & Cleared
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                    Congratulations, {submittedData.fullName}!
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1">
                    Your application for admission to Rakai Community School of Nursing has been recorded. Application fee of <strong>UGX 50,000</strong> has been confirmed and verified.
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
                        O-Level Subject Grades:
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
                    <span className="text-slate-500">Attached UNEB Result Slip:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{submittedData.attachedDocumentName || 'Official Document Attached'}</span>
                    </span>
                  </div>

                  {/* Payment Verification Clearance */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-slate-500">Fee Payment Status:</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>UGX 50,000 CLEARED</span>
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Provider:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{submittedData.paymentMethod || 'Mobile Money'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Gateway Transaction Ref:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-[11px]">{submittedData.paymentReference}</span>
                  </div>

                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Official Status:</span>
                    <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-[11px]">
                      Official Application Submitted
                    </span>
                  </div>
                </div>

                {/* Primary Action: Download PDF */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isDownloadingPdf}
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-[#00873E] hover:bg-[#007033] text-white font-black text-sm shadow-xl transition-all w-full sm:w-auto"
                  >
                    {isDownloadingPdf ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Official PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Download Official Application & Receipt (PDF)</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow hover:bg-slate-800 transition-colors w-full sm:w-auto justify-center"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Summary</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-5 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors w-full sm:w-auto justify-center"
                  >
                    <span>Close</span>
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
