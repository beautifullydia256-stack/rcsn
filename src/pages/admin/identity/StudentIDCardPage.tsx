import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import AdminPageWrapper from "@/components/layout/AdminPageWrapper";
import IDCard from "./components/IDCard";

export default function StudentIDCardPage() {
  const navigate = useNavigate();
  const { id: studentId } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const cardRef = useRef<HTMLDivElement>(null);

  const [student, setStudent] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !studentId) return;

      // Fetch school_id from users table
      const { data: userData } = await supabase
        .from("users")
        .select("school_id")
        .eq("user_id", user.id)
        .single();

      if (!userData?.school_id) {
        setLoading(false);
        return;
      }

      // Fetch school data
      const { data: schoolData } = await supabase
        .from("schools")
        .select("*")
        .eq("school_id", userData.school_id)
        .single();

      setSchool(schoolData);

      // Fetch student data
      const { data: studentData } = await supabase
        .from("students")
        .select("*")
        .eq("student_id", studentId)
        .single();

      setStudent(studentData);
      setLoading(false);
    };

    fetchData();
  }, [user, studentId]);

  const handleDownloadPNG = async () => {
    if (!cardRef.current) return;

    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${student.name}_ID_Card.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      });
    } catch (error) {
      console.error("Error downloading PNG:", error);
      alert("Failed to download PNG. Please try again.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <AdminPageWrapper title="Loading...">
        <div className="text-center py-12 text-gray-500">
          <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p>Loading ID card...</p>
        </div>
      </AdminPageWrapper>
    );
  }

  if (!student || !school) {
    return (
      <AdminPageWrapper title="Not Found">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 text-center">
          <p className="text-gray-600 mb-4">Student not found</p>
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

  return (
    <>
      {/* Screen View */}
      <div className="print:hidden">
        <AdminPageWrapper title={`ID Card - ${student.name}`}>
          <div className="space-y-6">
            {/* Actions */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => navigate("/dashboard/admin/identity")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to list
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadPNG}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PNG
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 font-medium transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>
            </div>

            {/* ID Card Preview – contained so it displays like a card in the middle */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center items-start p-6 bg-gray-100/50 rounded-xl min-h-[320px]"
            >
              <div ref={cardRef} className="inline-block rounded-lg overflow-hidden">
                <IDCard student={student} school={school} />
              </div>
            </motion.div>
          </div>
        </AdminPageWrapper>
      </div>

      {/* Print View – card at CR80 size for print */}
      <div className="hidden print:block print:p-0">
        <IDCard student={student} school={school} forPrint />
      </div>

      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </>
  );
}
