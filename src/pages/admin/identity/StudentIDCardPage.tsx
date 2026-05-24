import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Download } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import AdminPageWrapper from "@/components/layout/AdminPageWrapper";
import { IDCardFront, IDCardBack, type IDCardStudent, type IDCardSchool } from "./components/IDCard";
import { generateIdCardPdf } from "./components/idCardPdf";

export default function StudentIDCardPage() {
  const navigate = useNavigate();
  const { id: studentId } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);

  const [cardStudent, setCardStudent] = useState<IDCardStudent | null>(null);
  const [cardSchool, setCardSchool] = useState<IDCardSchool | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user?.id || !studentId) return;

    const fetchData = async () => {
      const { data: userData } = await supabase
        .from("users")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!userData?.school_id) {
        setLoading(false);
        return;
      }

      const schoolId = userData.school_id;

      const [{ data: schoolData }, { data: studentData }, { data: photoRow }] =
        await Promise.all([
          supabase
            .from("schools")
            .select("name,logo_url,address,location,contact_phone,contact_email,motto,pobox")
            .eq("school_id", schoolId)
            .single(),
          supabase.from("students").select("*").eq("student_id", studentId).single(),
          supabase
            .from("student_photos")
            .select("photo_url")
            .eq("school_id", schoolId)
            .eq("student_id", studentId)
            .eq("is_primary", true)
            .maybeSingle(),
        ]);

      setCardSchool(schoolData ?? null);

      if (studentData) {
        setCardStudent({
          student_id: studentData.student_id,
          name: studentData.name,
          first_name: studentData.first_name,
          middle_name: studentData.middle_name,
          last_name: studentData.last_name,
          current_class: studentData.current_class,
          admission_number: studentData.admission_number,
          date_of_birth: studentData.date_of_birth,
          gender: studentData.gender,
          guardian_name: studentData.guardian_name,
          guardian_phone: studentData.guardian_phone,
          blood_group: studentData.blood_group,
          medical_condition: studentData.medical_condition,
          address: studentData.address,
          photoUrl: (photoRow as any)?.photo_url ?? null,
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [user, studentId]);

  const handleDownloadPdf = async () => {
    if (!cardStudent || !cardSchool) return;
    setDownloading(true);
    try {
      await generateIdCardPdf(cardStudent, cardSchool);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <AdminPageWrapper title="Loading…">
        <div className="text-center py-12">
          <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="ac-text-secondary">Loading ID card…</p>
        </div>
      </AdminPageWrapper>
    );
  }

  if (!cardStudent || !cardSchool) {
    return (
      <AdminPageWrapper title="Not Found">
        <div className="rounded-xl border border-[var(--ac-border)] bg-[var(--ac-surface)] shadow-sm p-8 text-center">
          <p className="ac-text-secondary mb-4">Student not found.</p>
          <button
            onClick={() => navigate("/dashboard/admin/identity")}
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 font-medium transition-colors"
          >
            Back to Identity
          </button>
        </div>
      </AdminPageWrapper>
    );
  }

  const displayName =
    [cardStudent.first_name, cardStudent.middle_name, cardStudent.last_name]
      .filter((x) => x?.trim())
      .join(" ") ||
    cardStudent.name ||
    "Student";

  return (
    <AdminPageWrapper title={`ID Card — ${displayName}`}>
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="rounded-xl border border-[var(--ac-border)] bg-[var(--ac-surface)] shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate("/dashboard/admin/identity")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--ac-border)] ac-text-secondary hover:bg-slate-50 dark:hover:bg-slate-800/50 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to list
          </button>
          <button
            onClick={() => void handleDownloadPdf()}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {downloading ? "Generating PDF…" : "Download PDF"}
          </button>
        </div>

        {/* Card previews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-8 pb-4"
        >
          <div className="text-center">
            <p className="text-xs font-semibold ac-text-muted uppercase tracking-widest mb-3">
              Front
            </p>
            <IDCardFront student={cardStudent} school={cardSchool} />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold ac-text-muted uppercase tracking-widest mb-3">
              Back
            </p>
            <IDCardBack student={cardStudent} school={cardSchool} />
          </div>
        </motion.div>
      </div>
    </AdminPageWrapper>
  );
}
