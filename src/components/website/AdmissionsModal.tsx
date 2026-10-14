import React, { useState, useRef, useEffect } from 'react';
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
  Check,
  Search,
  Camera,
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

interface AttachedDocItem {
  id: string;
  name: string;
  size: string;
  sizeBytes?: number;
  data: string;
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

export const AVAILABLE_PROGRAMS = [
  { name: 'Certificate in Nursing', duration: '2.5 Years', entry: 'UCE Science Passes' },
  { name: 'Certificate in Midwifery', duration: '2.5 Years', entry: 'UCE Science Passes' },
  { name: 'Diploma in Nursing (Direct Entry)', duration: '3 Years', entry: 'UACE Principal in Biology' },
  { name: 'Diploma in Midwifery (Direct Entry)', duration: '3 Years', entry: 'UACE Principal in Biology' },
  { name: 'Diploma in Nursing / Midwifery (Extension)', duration: '1.5 Years', entry: 'UNMC Registration & 2 Yrs Practice' },
];

export function resolveProgramName(target?: string): string {
  if (!target) return 'Certificate in Nursing';
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetClean = clean(target);
  const found = AVAILABLE_PROGRAMS.find((p) => {
    const pClean = clean(p.name);
    return pClean === targetClean || pClean.includes(targetClean) || targetClean.includes(pClean);
  });
  return found ? found.name : target;
}

async function processDocumentFile(file: File): Promise<{ name: string; size: string; data: string }> {
  if (file.type.startsWith('image/')) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_DIM = 1600;
          let width = img.width;
          let height = img.height;
          if (width > height && width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            const approxBytes = Math.round((compressed.length * 3) / 4);
            const sizeStr =
              approxBytes > 1024 * 1024
                ? `${(approxBytes / (1024 * 1024)).toFixed(1)} MB`
                : `${Math.round(approxBytes / 1024)} KB`;
            resolve({ name: file.name, size: sizeStr, data: compressed });
          } else {
            resolve({
              name: file.name,
              size:
                file.size > 1024 * 1024
                  ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                  : `${Math.round(file.size / 1024)} KB`,
              data: (e.target?.result as string) || '',
            });
          }
        };
        img.onerror = () => {
          resolve({
            name: file.name,
            size: `${Math.round(file.size / 1024)} KB`,
            data: (e.target?.result as string) || '',
          });
        };
        img.src = (e.target?.result as string) || '';
      };
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const sizeStr =
        file.size > 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.round(file.size / 1024)} KB`;
      resolve({ name: file.name, size: sizeStr, data: (reader.result as string) || '' });
    };
    reader.readAsDataURL(file);
  });
}

export default function AdmissionsModal({ isOpen, onClose, preselectedProgram }: AdmissionsModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<AdmissionApplication | null>(null);

  const modalBodyRef = useRef<HTMLDivElement>(null);

  // Automatically scroll modal body to top whenever navigating to a new step
  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [step]);

  const programs = AVAILABLE_PROGRAMS;

  // Form State - Multi-Program Support
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(() => [
    resolveProgramName(preselectedProgram),
  ]);
  const [intake, setIntake] = useState('January Intake (2026/2027)');

  // Immediately synchronize pre-selected course whenever modal opens or course changes
  useEffect(() => {
    if (isOpen && preselectedProgram) {
      const resolved = resolveProgramName(preselectedProgram);
      setSelectedPrograms([resolved]);
      setStep(1);
    }
  }, [isOpen, preselectedProgram]);

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

  // Document Attachments (Multi-document support)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedDocs, setAttachedDocs] = useState<AttachedDocItem[]>([]);
  const [attachmentError, setAttachmentError] = useState('');

  // Passport Photo Attachment
  const passportInputRef = useRef<HTMLInputElement>(null);
  const [passportPhotoData, setPassportPhotoData] = useState('');
  const [passportPhotoName, setPassportPhotoName] = useState('');
  const [passportPhotoSize, setPassportPhotoSize] = useState('');
  const [passportPhotoError, setPassportPhotoError] = useState('');

  const handlePassportPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPassportPhotoError('Please upload a valid image file (JPG, JPEG, or PNG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPassportPhotoError('Passport photo should not exceed 5MB.');
      return;
    }

    setPassportPhotoError('');
    const processed = await processDocumentFile(file);
    setPassportPhotoName(processed.name);
    setPassportPhotoSize(processed.size);
    setPassportPhotoData(processed.data);
  };

  const handleRemovePassportPhoto = () => {
    setPassportPhotoData('');
    setPassportPhotoName('');
    setPassportPhotoSize('');
    setPassportPhotoError('');
    if (passportInputRef.current) passportInputRef.current.value = '';
  };

  // Step 4: Mobile Money Payment Gateway (UGX 50,000)
  const APPLICATION_FEE_UGX = 50000;
  const [paymentProvider, setPaymentProvider] = useState<'MTN Mobile Money' | 'Airtel Money'>('MTN Mobile Money');
  const [payingPhone, setPayingPhone] = useState('');
  const [paymentState, setPaymentState] = useState<'idle' | 'initiating' | 'awaiting_pin' | 'verifying' | 'success'>('idle');
  const [submitProgress, setSubmitProgress] = useState<{ percent: number; label: string }>({
    percent: 0,
    label: '',
  });
  const [txnReference, setTxnReference] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);


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

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const MAX_SINGLE_FILE_BYTES = 3 * 1024 * 1024; // 3 MB per document
    const MAX_TOTAL_FILES_BYTES = 6 * 1024 * 1024; // 6 MB total

    // 1. Check if any individual file exceeds 3MB
    const oversizedFile = fileList.find((f) => f.size > MAX_SINGLE_FILE_BYTES);
    if (oversizedFile) {
      setAttachmentError(
        `"${oversizedFile.name}" exceeds the 3MB limit (${(oversizedFile.size / (1024 * 1024)).toFixed(1)}MB). Please upload documents or clear pictures under 3MB each.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Check if total attachments size would exceed 6MB
    const currentTotalBytes = attachedDocs.reduce((sum, d) => sum + (d.sizeBytes || 0), 0);
    const newFilesTotalBytes = fileList.reduce((sum, f) => sum + f.size, 0);
    if (currentTotalBytes + newFilesTotalBytes > MAX_TOTAL_FILES_BYTES) {
      setAttachmentError(
        `Total combined attachments size cannot exceed 6MB. Current attachments: ${(currentTotalBytes / (1024 * 1024)).toFixed(1)}MB, new files: ${(newFilesTotalBytes / (1024 * 1024)).toFixed(1)}MB.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setAttachmentError('');

    for (const file of fileList) {
      const processed = await processDocumentFile(file);
      setAttachedDocs((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: processed.name,
          size: processed.size,
          sizeBytes: file.size,
          data: processed.data,
        },
      ]);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveDoc = (id: string) => {
    setAttachedDocs((prev) => prev.filter((d) => d.id !== id));
  };

  // Pre-fill paying phone when navigating to step 4
  const handleProceedToPayment = () => {
    if (attachedDocs.length === 0) {
      setAttachmentError('Please attach at least one academic result slip or certificate before proceeding.');
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
    setSubmitProgress({ percent: 20, label: 'Uploading academic documents...' });
    await new Promise((r) => setTimeout(r, 600));

    setSubmitProgress({ percent: 50, label: 'Uploading academic documents...' });
    await new Promise((r) => setTimeout(r, 500));

    setSubmitProgress({ percent: 75, label: 'Submitting candidate application...' });

    setIsSubmitting(true);
    try {
      const subjectGradesPayload: SubjectGrade[] = subjects.map((s) => ({
        subject: s.subject,
        grade: s.grade,
      }));

      const primaryDocName = attachedDocs.map((d) => d.name).join(', ');
      const primaryDocSize =
        attachedDocs.length === 1
          ? attachedDocs[0].size
          : `${attachedDocs.length} documents`;
      const primaryDocData = attachedDocs[0]?.data || undefined;

      const res = await submitAdmissionApplication({
        fullName,
        gender,
        dateOfBirth: dateOfBirth || '2005-01-01',
        phone,
        email: email || undefined,
        ninOrId: ninOrId || undefined,
        programs: selectedPrograms,
        program: selectedPrograms[0],
        intake,
        previousSchool,
        indexNumber,
        qualificationsSummary: `Academic documents uploaded (${attachedDocs.length}): ${primaryDocName}`,
        subjectGrades: subjectGradesPayload,
        attachedDocumentName: primaryDocName,
        attachedDocumentSize: primaryDocSize,
        attachedDocumentData: primaryDocData,
        attachedDocuments: attachedDocs.map((d) => ({
          name: d.name,
          size: d.size,
          data: d.data,
        })),
        passportPhotoData: passportPhotoData || undefined,
        passportPhotoName: passportPhotoName || undefined,
        applicationFee: APPLICATION_FEE_UGX,
        paymentMethod: paymentProvider,
        paymentReference: txnReference || `RCSN-MM-${Date.now().toString().slice(-7)}`,
        guardianName,
        guardianPhone,
      });

      if (res.success) {
        setSubmitProgress({ percent: 90, label: 'Generating receipt...' });
        await new Promise((r) => setTimeout(r, 400));
        setSubmitProgress({ percent: 100, label: 'Generating receipt...' });
        await new Promise((r) => setTimeout(r, 300));

        setPaymentState('success');
        setSubmittedData(res.application);
        setStep(5);
      } else {
        setPaymentError(res.message || 'We could not save your application to the central registry. If you attached large files, please ensure they are clear photos/PDFs under 3MB.');
        setPaymentState('idle');
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      setPaymentError(err?.message || 'Failed to record application after payment. Please ensure uploaded documents are under 3MB and try again.');
      setPaymentState('idle');
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
    setAttachedDocs([]);
    setPassportPhotoData('');
    setPassportPhotoName('');
    setPassportPhotoSize('');
    setPassportPhotoError('');
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
        {/* Backdrop - Solid high-contrast dimming */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40"
        />

        {/* Modal Dialog - Solid crisp card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[28px] shadow-2xl overflow-hidden z-50 border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] text-slate-900 dark:text-white"
        >
          {/* Header - Solid rich school forest green */}
          <div className="bg-[#006028] dark:bg-slate-950 text-white p-5 sm:p-6 border-b border-emerald-800/40 dark:border-slate-800 shrink-0 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center p-1 shrink-0 shadow-sm">
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
                  <p className="text-xs text-emerald-200 font-bold">
                    Official Online Application Portal • 2026/2027 Academic Year
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-emerald-100 hover:text-white hover:bg-emerald-800 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close application modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper Progress */}
            {step < 5 && (
              <div className="grid grid-cols-4 gap-2 mt-5 text-xs font-bold text-center">
                <div
                  className={`flex items-center justify-center gap-1.5 pb-2 border-b-2 transition-colors ${
                    step >= 1 ? 'border-amber-300 text-amber-200' : 'border-emerald-700/60 text-emerald-200/70'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    step >= 1 ? 'bg-amber-400 text-slate-950' : 'bg-emerald-900/80 text-emerald-200'
                  }`}>
                    1
                  </span>
                  <span className="truncate">Programs</span>
                </div>
                <div
                  className={`flex items-center justify-center gap-1.5 pb-2 border-b-2 transition-colors ${
                    step >= 2 ? 'border-amber-300 text-amber-200' : 'border-emerald-700/60 text-emerald-200/70'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    step >= 2 ? 'bg-amber-400 text-slate-950' : 'bg-emerald-900/80 text-emerald-200'
                  }`}>
                    2
                  </span>
                  <span className="truncate">Personal</span>
                </div>
                <div
                  className={`flex items-center justify-center gap-1.5 pb-2 border-b-2 transition-colors ${
                    step >= 3 ? 'border-amber-300 text-amber-200' : 'border-emerald-700/60 text-emerald-200/70'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    step >= 3 ? 'bg-amber-400 text-slate-950' : 'bg-emerald-900/80 text-emerald-200'
                  }`}>
                    3
                  </span>
                  <span className="truncate">Grades & Files</span>
                </div>
                <div
                  className={`flex items-center justify-center gap-1.5 pb-2 border-b-2 transition-colors ${
                    step >= 4 ? 'border-amber-300 text-amber-200' : 'border-emerald-700/60 text-emerald-200/70'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    step >= 4 ? 'bg-amber-400 text-slate-950' : 'bg-emerald-900/80 text-emerald-200'
                  }`}>
                    4
                  </span>
                  <span className="truncate">Payment</span>
                </div>
              </div>
            )}
          </div>

          {/* Form Body - Solid Opaque Background with High Contrast Text */}
          <div ref={modalBodyRef} className="p-5 sm:p-7 overflow-y-auto flex-1 no-scrollbar bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
            {/* STEP 1: Program Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-900 dark:text-white mb-2">
                    Select Preferred Intake
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {['January Intake (2026/2027)', 'July Intake (2026/2027)'].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setIntake(i)}
                        className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          intake === i
                            ? 'border-[#00873E] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100 font-bold shadow-sm ring-2 ring-[#00873E]'
                            : 'border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 hover:border-slate-400 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 font-semibold'
                        }`}
                      >
                        <span className="text-sm font-bold">{i}</span>
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
                    <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold">
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
                              ? 'border-[#00873E] bg-emerald-50 dark:bg-emerald-950/60 text-slate-900 dark:text-white shadow-sm ring-2 ring-[#00873E]'
                              : 'border-slate-300 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/60 hover:border-slate-400 dark:hover:border-slate-600 text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-sm font-black text-slate-900 dark:text-white leading-snug">{p.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00873E] text-white text-[11px] font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Choice {choiceIndex + 1}</span>
                                </span>
                              ) : (
                                <span className="w-5 h-5 rounded-md border-2 border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-800 block" />
                              )}
                            </div>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-600 dark:text-slate-300">Duration: {p.duration}</span>
                            <span className="font-bold text-[#00873E] dark:text-emerald-400">{p.entry}</span>
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
                {/* Official Passport Photograph Upload */}
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-emerald-600" />
                        <span>Applicant Passport Photograph *</span>
                      </label>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Upload a clear, front-facing official passport-sized color photo (Max 5MB). This photo is attached to your application and student profile.
                      </p>
                    </div>
                  </div>

                  <input
                    ref={passportInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handlePassportPhotoChange}
                    className="hidden"
                  />

                  {passportPhotoError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{passportPhotoError}</span>
                    </div>
                  )}

                  {passportPhotoData ? (
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/40 shadow-sm">
                      <img
                        src={passportPhotoData}
                        alt="Applicant Passport Preview"
                        className="w-20 h-24 rounded-xl object-cover border-2 border-emerald-500 shadow-md shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span className="truncate">{passportPhotoName || 'passport-photo.jpg'}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{passportPhotoSize} • Standard Passport Format</div>
                        <div className="flex items-center gap-3 mt-2.5">
                          <button
                            type="button"
                            onClick={() => passportInputRef.current?.click()}
                            className="text-xs font-bold text-emerald-600 hover:underline"
                          >
                            Change Photo
                          </button>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <button
                            type="button"
                            onClick={handleRemovePassportPhoto}
                            className="text-xs font-semibold text-rose-500 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => passportInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer bg-white dark:bg-slate-900 transition-colors flex flex-col items-center justify-center gap-1.5"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Click to select & upload Passport Photo
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Supports JPG, JPEG, PNG (Front-facing with white / plain background)
                      </span>
                    </div>
                  )}
                </div>

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
                    disabled={!fullName.trim() || !phone.trim() || !guardianName.trim() || !guardianPhone.trim() || !dateOfBirth.trim()}
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

                {/* DOCUMENT UPLOADS (ACADEMIC RESULTS / CERTIFICATES / TESTIMONIALS) */}
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <Upload className="w-4 h-4 text-[#00873E]" />
                        <span>Attach Academic Documents &amp; Certificates *</span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        Upload your official academic papers (such as UCE / UACE result slips, academic certificates, transcripts, or testimonials). Supports clear photos or PDF documents (Max 3MB per document, up to 6MB total).
                      </p>
                    </div>
                    {attachedDocs.length > 0 && (
                      <span className="self-start shrink-0 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold">
                        {attachedDocs.length} {attachedDocs.length === 1 ? 'Document' : 'Documents'} Attached
                      </span>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFilesChange}
                    className="hidden"
                  />

                  {attachedDocs.length === 0 ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#00873E] dark:hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-white dark:bg-slate-900 transition-all hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-[#00873E] dark:text-emerald-400 mx-auto mb-2 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                        Click to browse &amp; upload Academic Documents
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-1">
                        Supports PDF, PNG, JPG, or JPEG (Max 3MB per document, up to 6MB total) • You can select multiple files or add more
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="space-y-2">
                        {attachedDocs.map((doc, idx) => (
                          <div
                            key={doc.id}
                            className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between shadow-sm hover:border-emerald-400 transition-all"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0 font-bold text-xs">
                                #{idx + 1}
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                  {doc.name}
                                </span>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>{doc.size}</span>
                                  <span>•</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                    <FileCheck className="w-3 h-3" />
                                    <span>Ready for Submission</span>
                                  </span>
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDoc(doc.id)}
                              title="Remove this document"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 ml-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add Another Document Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2.5 px-4 rounded-xl border border-dashed border-emerald-400 dark:border-emerald-700/80 hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 text-[#00873E] dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Another Document (e.g. UACE, Certificate, Testimonial)</span>
                      </button>
                    </div>
                  )}

                  {attachmentError && (
                    <p className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5 pt-1">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{attachmentError}</span>
                    </p>
                  )}
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
                    disabled={!previousSchool.trim() || !indexNumber.trim() || attachedDocs.length === 0}
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
                  <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white text-center space-y-4 border border-slate-800 shadow-2xl max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-[#00873E]/20 border border-[#00873E]/40 text-emerald-400 mx-auto flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    </div>

                    <div className="space-y-1">
                      <h5 className="text-sm sm:text-base font-bold text-white">
                        {submitProgress.label}
                      </h5>
                      <span className="text-xs text-emerald-400 font-mono font-bold block">
                        {submitProgress.percent}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700 p-0.5">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${submitProgress.percent}%` }}
                      />
                    </div>
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
                      <span>Pay UGX 50,000 via {paymentProvider}</span>
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

                  {/* Attached Documents Status */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-slate-500">Attached Academic Documents:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {submittedData.attachedDocuments && submittedData.attachedDocuments.length > 0
                          ? `${submittedData.attachedDocuments.length} Document(s) Attached`
                          : submittedData.attachedDocumentName || 'Official Documents Attached'}
                      </span>
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

                  <a
                    href={`/application-status?id=${submittedData.id}`}
                    onClick={() => {
                      resetForm();
                      onClose();
                    }}
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold text-xs shadow-sm hover:bg-emerald-100 transition-colors w-full sm:w-auto justify-center"
                  >
                    <Search className="w-4 h-4 text-emerald-600" />
                    <span>Application Status</span>
                  </a>

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
