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
  const { user, schoolId, setSchoolId } = useAuthStore();
  const cardRef = useRef<HTMLDivElement>(null);

  const [student, setStudent] = useState<any>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // If schoolId is not in store, fetch it
      let currentSchoolId = schoolId;
      if (!currentSchoolId && user) {
        const { data: userData } = await supabase
          .from("users")
          .select("school_id")
          .eq("user_id", user.id)
          .single();
        
        if (userData?.school_id) {
          currentSchoolId = userData.school_id;
          setSchoolId(currentSchoolId);
        }
      }

      if (!currentSchoolId || !studentId) {
        setLoading(false);
        return;
      }

      // Fetch school data
      const { data: schoolData } = await supabase
        .from("schools")
        .select("*")
        .eq("school_id", currentSchoolId)
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
  }, [schoolId, studentId, user, setSchoolId]);

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
        <div className="text-center py-12 text-white/70">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading ID card...</p>
        </div>
      </AdminPageWrapper>
    );
  }

  if (!student || !school) {
    return (
      <AdminPageWrapper title="Not Found">
        <div className="text-center py-12">
          <p className="text-white/70 mb-4">Student not found</p>
          <button
            onClick={() => navigate("/dashboard/admin/identity")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
            <div className="flex items-center justify-between">
              <button
                onClick={() => navigate("/dashboard/admin/identity")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadPNG}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download PNG
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print
                </button>
              </div>
            </div>

            {/* ID Card Preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <div ref={cardRef} className="inline-block">
                <IDCard student={student} school={school} />
              </div>
            </motion.div>
          </div>
        </AdminPageWrapper>
      </div>

      {/* Print View */}
      <div className="hidden print:block">
        <IDCard student={student} school={school} />
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
