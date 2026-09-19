import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import AdminPageWrapper, { adminCardClass } from '../../components/layout/AdminPageWrapper';
import { Loader2, Download } from 'lucide-react';

interface SchoolInfo {
  name: string;
  motto: string;
  logo_url: string | null;
  contact_email: string;
  contact_phone: string;
  location: string;
  website: string;
}

interface AdmissionFormData {
  academic_year: string;
  term: string;
  applying_class: string;
  student_name: string;
  dob: string;
  gender: string;
  nationality: string;
  religion: string;
  previous_school: string;
  father_name: string;
  father_phone: string;
  father_email: string;
  father_occupation: string;
  mother_name: string;
  mother_phone: string;
  mother_email: string;
  mother_occupation: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_relation: string;
  home_address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_relation: string;
  medical_conditions: string;
  allergies: string;
  blood_group: string;
}

const CURRENT_YEAR = new Date().getFullYear();

const EMPTY: AdmissionFormData = {
  academic_year: `${CURRENT_YEAR}/${CURRENT_YEAR + 1}`,
  term: 'Term 1',
  applying_class: '',
  student_name: '',
  dob: '',
  gender: '',
  nationality: 'Ugandan',
  religion: '',
  previous_school: '',
  father_name: '',
  father_phone: '',
  father_email: '',
  father_occupation: '',
  mother_name: '',
  mother_phone: '',
  mother_email: '',
  mother_occupation: '',
  guardian_name: '',
  guardian_phone: '',
  guardian_relation: '',
  home_address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_relation: '',
  medical_conditions: '',
  allergies: '',
  blood_group: '',
};

async function fetchSchoolInfo(schoolId: string): Promise<SchoolInfo | null> {
  const { data } = await supabase
    .from('schools')
    .select('name, motto, logo_url, contact_email, contact_phone, location, website')
    .eq('school_id', schoolId)
    .single();
  if (!data) return null;
  return {
    name: (data as { name?: string }).name || 'Your School',
    motto: (data as { motto?: string }).motto || '',
    logo_url: (data as { logo_url?: string | null }).logo_url || null,
    contact_email: (data as { contact_email?: string }).contact_email || '',
    contact_phone: (data as { contact_phone?: string }).contact_phone || '',
    location: (data as { location?: string }).location || '',
    website: (data as { website?: string }).website || '',
  };
}

function toDataUrl(url: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      c.getContext('2d')!.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}

async function generateAdmissionPdf(school: SchoolInfo, form: AdmissionFormData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210;

  let logoData = '';
  if (school.logo_url) {
    logoData = await toDataUrl(school.logo_url);
  }

  // Header background
  doc.setFillColor(25, 50, 100);
  doc.rect(0, 0, W, 40, 'F');

  // Logo
  if (logoData) {
    try { doc.addImage(logoData, 'PNG', 10, 5, 28, 28); } catch { /* skip */ }
  }

  // School name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(school.name.toUpperCase(), W / 2, 15, { align: 'center' });

  if (school.motto) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`"${school.motto}"`, W / 2, 22, { align: 'center' });
  }

  // Contact footer line in header
  const contactParts = [school.location, school.contact_phone, school.contact_email, school.website].filter(Boolean);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(contactParts.join(' | '), W / 2, 30, { align: 'center' });

  // Form title
  doc.setFillColor(245, 247, 250);
  doc.rect(0, 40, W, 14, 'F');
  doc.setTextColor(25, 50, 100);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT ADMISSION FORM', W / 2, 50, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Academic Year: ${form.academic_year} | ${form.term}`, W / 2, 56, { align: 'center' });

  let y = 64;

  const section = (title: string) => {
    doc.setFillColor(25, 50, 100);
    doc.rect(10, y, W - 20, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 13, y + 5);
    y += 10;
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
  };

  const row = (label: string, value: string, col2Label?: string, col2Value?: string) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', 12, y);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(180, 180, 180);
    doc.line(35, y, col2Label ? 103 : W - 12, y);
    doc.text(value || '', 37, y - 1);
    if (col2Label) {
      doc.setFont('helvetica', 'bold');
      doc.text(col2Label + ':', 106, y);
      doc.setFont('helvetica', 'normal');
      doc.line(128, y, W - 12, y);
      doc.text(col2Value || '', 130, y - 1);
    }
    y += 8;
  };

  // Section 1: Student Info
  section('SECTION A: STUDENT INFORMATION');
  row('Full Name', form.student_name);
  row('Date of Birth', form.dob, 'Gender', form.gender);
  row('Nationality', form.nationality, 'Religion', form.religion);
  row('Class Applying', form.applying_class, 'Blood Group', form.blood_group);
  row('Previous School', form.previous_school);
  y += 2;

  // Section 2: Father's Info
  section('SECTION B: FATHER / MALE GUARDIAN INFORMATION');
  row("Father's Name", form.father_name);
  row('Phone', form.father_phone, 'Email', form.father_email);
  row('Occupation', form.father_occupation);
  y += 2;

  // Section 3: Mother's Info
  section('SECTION C: MOTHER / FEMALE GUARDIAN INFORMATION');
  row("Mother's Name", form.mother_name);
  row('Phone', form.mother_phone, 'Email', form.mother_email);
  row('Occupation', form.mother_occupation);
  y += 2;

  // Section 4: Home address
  section('SECTION D: HOME ADDRESS & GUARDIAN');
  row('Home Address', form.home_address);
  row('Guardian Name', form.guardian_name, 'Relation', form.guardian_relation);
  row('Guardian Phone', form.guardian_phone);
  y += 2;

  // Section 5: Emergency + Medical
  section('SECTION E: EMERGENCY CONTACT & HEALTH');
  row('Emergency Contact', form.emergency_contact_name, 'Relation', form.emergency_relation);
  row('Emergency Phone', form.emergency_contact_phone);
  row('Medical Conditions', form.medical_conditions);
  row('Known Allergies', form.allergies);
  y += 4;

  // Declaration
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text('I hereby declare that the information provided above is true and correct to the best of my knowledge.', 12, y);
  y += 10;

  // Signature lines
  const sigY = y + 10;
  doc.setDrawColor(100, 100, 100);
  doc.line(12, sigY, 80, sigY);
  doc.line(100, sigY, 170, sigY);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Parent/Guardian Signature & Date', 12, sigY + 5);
  doc.text('Head Teacher / Principal Signature & Date', 100, sigY + 5);

  // Footer
  const footerY = 285;
  doc.setDrawColor(25, 50, 100);
  doc.setLineWidth(0.5);
  doc.line(10, footerY, W - 10, footerY);
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`${school.name} | Generated by PwezaCore School Management System`, W / 2, footerY + 4, { align: 'center' });

  doc.save(`admission-form-${(form.student_name || 'blank').replace(/\s+/g, '-')}.pdf`);
}

export default function AdmissionFormPage() {
  const user = useAuthStore((s) => s.user);
  const schoolId = useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;
  const [form, setForm] = useState<AdmissionFormData>(EMPTY);
  const [generating, setGenerating] = useState(false);

  const { data: school, isLoading } = useQuery({
    queryKey: ['school-info-admission', schoolId],
    queryFn: () => fetchSchoolInfo(schoolId!),
    enabled: !!schoolId,
    staleTime: 10 * 60 * 1000,
  });

  const f = (k: keyof AdmissionFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  async function handleDownload() {
    if (!school) return;
    setGenerating(true);
    try { await generateAdmissionPdf(school, form); }
    finally { setGenerating(false); }
  }

  const inp = 'bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full';
  const label = 'block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider';

  const Section = ({ title }: { title: string }) => (
    <div className="col-span-full mt-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-700" />
        <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{title}</span>
        <div className="h-px flex-1 bg-slate-700" />
      </div>
    </div>
  );

  return (
    <AdminPageWrapper
      eyebrow="DOCUMENTS"
      title="Admission Form"
      subtitle="Fill in student details and download a school-branded admission form as PDF"
    >
      {/* School info preview */}
      {!isLoading && school && (
        <div className={`${adminCardClass} mb-6 p-4 flex items-center gap-4`}>
          {school.logo_url && <img src={school.logo_url} alt="logo" className="w-12 h-12 rounded-xl object-contain bg-slate-700" />}
          <div>
            <div className="font-bold text-slate-100">{school.name}</div>
            {school.motto && <div className="text-xs text-indigo-400 italic">"{school.motto}"</div>}
            <div className="text-xs text-slate-500 mt-0.5">{[school.location, school.contact_phone, school.contact_email].filter(Boolean).join(' · ')}</div>
          </div>
          <div className="ml-auto text-xs text-slate-500">This header appears on the generated PDF</div>
        </div>
      )}

      {/* Form */}
      <div className={`${adminCardClass} mb-6 p-6`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Academic */}
          <Section title="Academic Details" />
          <div>
            <label className={label}>Academic Year</label>
            <input value={form.academic_year} onChange={f('academic_year')} className={inp} placeholder="2025/2026" />
          </div>
          <div>
            <label className={label}>Term</label>
            <select value={form.term} onChange={f('term')} className={inp}>
              <option>Term 1</option><option>Term 2</option><option>Term 3</option>
            </select>
          </div>
          <div>
            <label className={label}>Class Applying For</label>
            <input value={form.applying_class} onChange={f('applying_class')} className={inp} placeholder="e.g. P1, S1, Grade 4" />
          </div>

          {/* Student Info */}
          <Section title="Student Information" />
          <div className="sm:col-span-2 lg:col-span-2">
            <label className={label}>Full Name</label>
            <input value={form.student_name} onChange={f('student_name')} className={inp} placeholder="Student's full name" />
          </div>
          <div>
            <label className={label}>Date of Birth</label>
            <input type="date" value={form.dob} onChange={f('dob')} className={inp} />
          </div>
          <div>
            <label className={label}>Gender</label>
            <select value={form.gender} onChange={f('gender')} className={inp}>
              <option value="">— Select —</option>
              <option>Male</option><option>Female</option>
            </select>
          </div>
          <div>
            <label className={label}>Nationality</label>
            <input value={form.nationality} onChange={f('nationality')} className={inp} />
          </div>
          <div>
            <label className={label}>Religion</label>
            <input value={form.religion} onChange={f('religion')} className={inp} placeholder="e.g. Christian, Muslim" />
          </div>
          <div>
            <label className={label}>Blood Group</label>
            <select value={form.blood_group} onChange={f('blood_group')} className={inp}>
              <option value="">— Select —</option>
              {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map((bg) => <option key={bg}>{bg}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Previous School</label>
            <input value={form.previous_school} onChange={f('previous_school')} className={inp} placeholder="Name of previous school (if any)" />
          </div>

          {/* Father */}
          <Section title="Father / Male Guardian" />
          <div className="sm:col-span-2">
            <label className={label}>Father's Full Name</label>
            <input value={form.father_name} onChange={f('father_name')} className={inp} />
          </div>
          <div><label className={label}>Phone</label><input value={form.father_phone} onChange={f('father_phone')} className={inp} /></div>
          <div><label className={label}>Email</label><input type="email" value={form.father_email} onChange={f('father_email')} className={inp} /></div>
          <div><label className={label}>Occupation</label><input value={form.father_occupation} onChange={f('father_occupation')} className={inp} /></div>

          {/* Mother */}
          <Section title="Mother / Female Guardian" />
          <div className="sm:col-span-2">
            <label className={label}>Mother's Full Name</label>
            <input value={form.mother_name} onChange={f('mother_name')} className={inp} />
          </div>
          <div><label className={label}>Phone</label><input value={form.mother_phone} onChange={f('mother_phone')} className={inp} /></div>
          <div><label className={label}>Email</label><input type="email" value={form.mother_email} onChange={f('mother_email')} className={inp} /></div>
          <div><label className={label}>Occupation</label><input value={form.mother_occupation} onChange={f('mother_occupation')} className={inp} /></div>

          {/* Address & Guardian */}
          <Section title="Home Address & Guardian" />
          <div className="sm:col-span-3">
            <label className={label}>Home Address</label>
            <input value={form.home_address} onChange={f('home_address')} className={inp} placeholder="Full home address" />
          </div>
          <div><label className={label}>Guardian Name</label><input value={form.guardian_name} onChange={f('guardian_name')} className={inp} /></div>
          <div><label className={label}>Guardian Phone</label><input value={form.guardian_phone} onChange={f('guardian_phone')} className={inp} /></div>
          <div><label className={label}>Relation to Student</label><input value={form.guardian_relation} onChange={f('guardian_relation')} className={inp} placeholder="e.g. Uncle, Aunt" /></div>

          {/* Emergency & Medical */}
          <Section title="Emergency Contact & Health" />
          <div className="sm:col-span-2">
            <label className={label}>Emergency Contact Name</label>
            <input value={form.emergency_contact_name} onChange={f('emergency_contact_name')} className={inp} />
          </div>
          <div><label className={label}>Relation</label><input value={form.emergency_relation} onChange={f('emergency_relation')} className={inp} /></div>
          <div><label className={label}>Emergency Phone</label><input value={form.emergency_contact_phone} onChange={f('emergency_contact_phone')} className={inp} /></div>
          <div><label className={label}>Medical Conditions</label><input value={form.medical_conditions} onChange={f('medical_conditions')} className={inp} placeholder="e.g. Asthma, Diabetes, None" /></div>
          <div><label className={label}>Known Allergies</label><input value={form.allergies} onChange={f('allergies')} className={inp} placeholder="e.g. Penicillin, Peanuts, None" /></div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={() => setForm(EMPTY)} className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold transition-colors">
            Clear Form
          </button>
          <button
            onClick={handleDownload}
            disabled={generating || isLoading || !school}
            className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold transition-colors flex items-center gap-2"
          >
            {generating ? (
              <span className="flex items-center gap-1.5"><Loader2 className="w-4 h-4 animate-spin shrink-0" /> Generating…</span>
            ) : (
              <span className="flex items-center gap-1.5"><Download className="w-4 h-4 shrink-0" /> Download Admission Form PDF</span>
            )}
          </button>
        </div>
      </div>
    </AdminPageWrapper>
  );
}
