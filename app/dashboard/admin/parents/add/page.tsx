"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function AddParentPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  
  // Login credentials
  const [createLogin, setCreateLogin] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sendEmailInvite, setSendEmailInvite] = useState(true);
  
  // Status
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error("Auth error:", userError);
          router.push("/login");
          return;
        }
        
        // Try to get school_id from users table
        const { data: userData, error: userDataError } = await supabase
          .from("users")
          .select("school_id")
          .eq("user_id", user.id)
          .single();
        
        if (userDataError) {
          console.error("Error fetching user data:", userDataError);
          // Try to get school_id from user metadata as fallback
          const userMetadata = (user as any).user_metadata || (user as any).raw_user_meta_data || {};
          const schoolIdFromMeta = userMetadata.school_id;
          
          if (!schoolIdFromMeta) {
            setError("Unable to determine school. Please contact support.");
            setLoading(false);
            return;
          }
          
          setSchoolId(schoolIdFromMeta);
          
          // Load school info
          const { data: schoolData, error: schoolError } = await supabase
            .from("schools")
            .select("name, address, phone")
            .eq("school_id", schoolIdFromMeta)
            .single();
          
          if (schoolError) {
            console.error("Error fetching school data:", schoolError);
            setError("Unable to load school information.");
            setLoading(false);
            return;
          }
          
          setSchoolInfo(schoolData);
          
          // Load students
          const { data: studs, error: studentsError } = await supabase
            .from("students")
            .select("student_id,name,current_class,admission_number")
            .eq("school_id", schoolIdFromMeta)
            .order("name");
          
          if (studentsError) {
            console.error("Error fetching students:", studentsError);
            // Don't fail completely, just log the error
          }
          
          setStudents(studs || []);
          setLoading(false);
        } else {
          if (!userData?.school_id) {
            setError("No school associated with your account. Please contact support.");
            setLoading(false);
            return;
          }
          
          setSchoolId(userData.school_id);
          
          // Load school info
          const { data: schoolData, error: schoolError } = await supabase
            .from("schools")
            .select("name, address, phone")
            .eq("school_id", userData.school_id)
            .single();
          
          if (schoolError) {
            console.error("Error fetching school data:", schoolError);
            setError("Unable to load school information.");
            setLoading(false);
            return;
          }
          
          setSchoolInfo(schoolData);
          
          // Load students
          const { data: studs, error: studentsError } = await supabase
            .from("students")
            .select("student_id,name,current_class,admission_number")
            .eq("school_id", userData.school_id)
            .order("name");
          
          if (studentsError) {
            console.error("Error fetching students:", studentsError);
            // Don't fail completely, just log the error
          }
          
          setStudents(studs || []);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Unexpected error:", err);
        setError(err.message || "An unexpected error occurred. Please try again.");
        setLoading(false);
      }
    };
    run();
  }, [router]);

  const validateForm = () => {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!name.trim()) {
      setError("Full name is required");
      return false;
    }
    if (!phone.trim()) {
      setError("Phone number is required");
      return false;
    }
    if (!studentId) {
      setError("Please select a student");
      return false;
    }
    if (createLogin && !sendEmailInvite) {
      if (!password.trim()) {
        setError("Password is required when not sending email invite");
        return false;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return false;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return false;
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    return true;
  };

  const save = async () => {
    if (!validateForm()) return;
    if (!schoolId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let parentId = null;

      // First, create parent record in parents table
      const { data: parentData, error: parentError } = await supabase
        .from("parents")
        .insert({ school_id: schoolId, name, email, phone, student_id: studentId })
        .select("parent_id")
        .single();

      if (parentError) throw parentError;
      parentId = parentData?.parent_id;

      // If createLogin is checked, create login credentials
      if (createLogin && parentId) {
        let authUser;
        
        if (sendEmailInvite) {
          // Send email invitation
          const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
            data: {
              name: name,
              role: 'parent',
              parent_id: parentId,
              student_id: studentId,
              school_id: schoolId
            }
          });
          
          if (error) throw new Error(`Login creation failed: ${error.message}`);
          authUser = data.user;
        } else {
          // Create user with password via API route
          const response = await fetch('/api/admin/create-parent-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password,
              parent_id: parentId,
              name,
              student_id: studentId,
              school_id: schoolId
            })
          });

          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Failed to create login');
          authUser = result.user;
        }

        if (!authUser) throw new Error("Failed to create user account");
        
        setSuccess(`Parent account created successfully! ${sendEmailInvite ? 'An invitation email has been sent.' : 'Parent can now log in with their credentials.'}`);
      } else {
        setSuccess("Parent record created successfully (no login access)");
      }
      
      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setStudentId("");
      setPassword("");
      setConfirmPassword("");
      setCreateLogin(true);
      setSendEmailInvite(true);

    } catch (error: any) {
      console.error("Error creating parent:", error);
      setError(error.message || "Failed to create parent account");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          <div className="text-white">Loading...</div>
        </div>
      </div>
    );
  }

  if (error && !schoolInfo) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <h2 className="text-xl font-semibold mb-2 text-red-300">Error Loading Page</h2>
            <p className="text-red-200 mb-4">{error}</p>
            <button
              onClick={() => router.push('/dashboard/admin')}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-semibold">Add Parent</h1>
            <p className="text-white/70 text-sm mt-1">{schoolInfo.name}</p>
          </div>
          <button 
            onClick={() => router.push('/dashboard/admin')}
            className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
          >
            Back to Dashboard
          </button>
        </div>

        {/* Form */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6"
        >
          {error && (
            <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 text-green-200 px-4 py-3">
              {success}
            </div>
          )}

          <div className="space-y-4">
            {/* Personal Information */}
            <h3 className="text-white font-medium text-lg">Parent Information</h3>
            
            <div>
              <label className="block text-white/70 text-sm mb-2">Full Name *</label>
              <input 
                type="text"
                className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/50 px-3 py-2 focus:border-blue-500 focus:outline-none" 
                placeholder="Enter parent's full name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Email Address *</label>
              <input 
                type="email"
                className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/50 px-3 py-2 focus:border-blue-500 focus:outline-none" 
                placeholder="Enter email address" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Phone Number *</label>
              <input 
                type="tel"
                className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/50 px-3 py-2 focus:border-blue-500 focus:outline-none" 
                placeholder="Enter phone number" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-2">Student *</label>
              <select
                className="w-full rounded-lg border border-white/10 bg-white/10 text-white px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              >
                <option value="" className="bg-slate-800">Select Student</option>
                {students.map((s) => (
                  <option key={s.student_id} value={s.student_id} className="bg-slate-800">
                    {s.name} - {s.current_class} {s.admission_number ? `(${s.admission_number})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Login Setup */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="createLogin"
                checked={createLogin}
                onChange={(e) => setCreateLogin(e.target.checked)}
                className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
              />
              <label htmlFor="createLogin" className="text-white font-medium">
                Create login account for parent portal access
              </label>
            </div>

            {createLogin && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="sendEmailInvite"
                    checked={sendEmailInvite}
                    onChange={(e) => setSendEmailInvite(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="sendEmailInvite" className="text-white/70 text-sm">
                    Send email invitation (parent will set their own password)
                  </label>
                </div>

                {!sendEmailInvite && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Password *</label>
                      <input 
                        type="password"
                        className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/50 px-3 py-2 focus:border-blue-500 focus:outline-none" 
                        placeholder="Enter password (min 6 characters)" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Confirm Password *</label>
                      <input 
                        type="password"
                        className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/50 px-3 py-2 focus:border-blue-500 focus:outline-none" 
                        placeholder="Confirm password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 py-3 px-6 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "Creating Parent..." : "Create Parent Account"}
            </button>
            <button
              onClick={() => router.push('/dashboard/admin')}
              className="px-6 py-3 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15 transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}



