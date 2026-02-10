import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function VerifyPage() {
  const { id: studentId } = useParams<{ id: string }>();

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyStudent = async () => {
      if (!studentId) {
        setError("No student ID provided");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("students")
          .select("*, schools(name, logo_url)")
          .eq("student_id", studentId)
          .single();

        if (fetchError || !data) {
          setError("Student not found");
          setLoading(false);
          return;
        }

        setStudent(data);
        setLoading(false);
      } catch (err) {
        setError("Failed to verify student");
        setLoading(false);
      }
    };

    verifyStudent();
  }, [studentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Verifying student ID...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full mx-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Verification Failed
            </h1>
            <p className="text-gray-600 mb-6">
              {error || "The student ID could not be verified."}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                This ID card may be invalid or expired. Please contact the school
                administration for assistance.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const isActive = student.status?.toLowerCase() === "active";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full"
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              {isActive ? (
                <CheckCircle className="w-12 h-12 text-green-600" />
              ) : (
                <AlertCircle className="w-12 h-12 text-yellow-600" />
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              ID Verification
            </h1>
            <p className="text-blue-100">
              {isActive ? "Valid Student ID" : "Inactive Student ID"}
            </p>
          </div>

          {/* Student Info */}
          <div className="p-8">
            {/* Photo and Basic Info */}
            <div className="flex items-start gap-6 mb-8">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-200 flex-shrink-0">
                {student.profile_picture_url ? (
                  <img
                    src={student.profile_picture_url}
                    alt={student.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold">
                    {student.name?.charAt(0) || "?"}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {student.name}
                </h2>
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-gray-600">
                  {student.schools?.name || "School Name"}
                </p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Admission Number</p>
                <p className="text-lg font-semibold text-gray-900">
                  {student.admission_number || "N/A"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Current Class</p>
                <p className="text-lg font-semibold text-gray-900">
                  {student.current_class || "N/A"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Date of Birth</p>
                <p className="text-lg font-semibold text-gray-900">
                  {student.date_of_birth
                    ? new Date(student.date_of_birth).toLocaleDateString("en-GB")
                    : "N/A"}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Gender</p>
                <p className="text-lg font-semibold text-gray-900">
                  {student.gender || "N/A"}
                </p>
              </div>
            </div>

            {/* Status Message */}
            <div
              className={`mt-8 rounded-lg p-4 ${
                isActive
                  ? "bg-green-50 border border-green-200"
                  : "bg-yellow-50 border border-yellow-200"
              }`}
            >
              <p
                className={`text-sm ${
                  isActive ? "text-green-800" : "text-yellow-800"
                }`}
              >
                {isActive
                  ? "✓ This student ID is valid and the student is currently enrolled."
                  : "⚠ This student ID is inactive. Please contact the school administration."}
              </p>
            </div>

            {/* Verification Time */}
            <div className="mt-6 text-center text-sm text-gray-500">
              Verified on {new Date().toLocaleString("en-GB")}
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            This is a read-only verification page. For any inquiries, please
            contact the school administration.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
