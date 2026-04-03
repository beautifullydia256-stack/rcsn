"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function AddAccountsManagerPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [schoolCode, setSchoolCode] = useState<string>("");
  
  // User details
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("admin");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  
  // Login credentials
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sendEmailInvite, setSendEmailInvite] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Status
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");
      const { data } = await supabase.from("users").select("school_id").eq("user_id", user.id).single();
      if (!data?.school_id) return router.push("/login");
      setSchoolId(data.school_id);
      
      // Load school info
      const { data: schoolData, error: schoolError } = await supabase
        .from("schools")
        .select("name")
        .eq("school_id", data.school_id)
        .single();
      
      if (schoolError) {
        console.error('School data error:', schoolError);
        setError(`Failed to load school data: ${schoolError.message}`);
        return;
      }
      setSchoolInfo(schoolData);
      
      // Generate school code from school name (first letter of first 3 words)
      // This matches the admission number generation logic: SCHOOL_CODE-YEAR-MONTH-NUMBER
      let schoolCode = "SCH";
      if (schoolData?.name) {
        // Take first letter of first 3 words
        // "Rakai Infant Primary School" -> "RIP" (R-I-P)
        // "Kampala Primary School" -> "KPS" (K-P-S)
        const words = schoolData.name.trim().split(/\s+/);
        if (words.length >= 3) {
          schoolCode = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
        } else if (words.length === 2) {
          schoolCode = (words[0][0] + words[1][0] + words[1][1]).toUpperCase();
        } else if (words.length === 1) {
          schoolCode = words[0].substring(0, 3).toUpperCase();
        }
        
        // TODO: Check if school code already exists and handle duplicates
        // If duplicate exists, either:
        // 1. Add number: RIP1, RIP2, etc.
        // 2. Take 4 letters: RIPI, RIPK, etc.
      }
      
      setSchoolCode(schoolCode);
      // School data loaded and school code generated
    };
    run();
  }, [router]);

  // Check if email exists and suggest alternatives
  const checkEmailAvailability = async (emailToCheck: string) => {
    try {
      const { data: existingUser, error } = await supabase
        .from("users")
        .select("email")
        .eq("email", emailToCheck)
        .single();
      
      if (existingUser) {
        return false; // Email exists
      }
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking email:', error);
        return null; // Error occurred
      }
      
      return true; // Email is available
    } catch (e) {
      console.error('Error checking email:', e);
      return null; // Error occurred
    }
  };

  const validateForm = async () => {
    if (!email || !firstName || !lastName || !phone) {
      setError("Please fill in all required fields");
      return false;
    }
    
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return false;
    }
    
    // Check if email already exists in database
    const emailAvailable = await checkEmailAvailability(email);
    
    if (emailAvailable === false) {
      setError("This email address is already in use. Enter a different email.");
      return false;
    }
    
    if (emailAvailable === null) {
      setError("Failed to verify email availability. Please try again.");
      return false;
    }
    
    if (!sendEmailInvite && (!password || !confirmPassword)) {
      setError("Please enter password and confirmation");
      return false;
    }
    
    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    
    if (password && password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    
    return true;
  };

  const save = async () => {
    setError(null);
    setSuccess(null);
    
    // Form data before validation
    
    if (!(await validateForm())) return;
    
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError("Your session expired. Please sign in again.");
        setSaving(false);
        return;
      }
      // Call API endpoint to create user (server-side with service role)
      const response = await fetch('/api/admin/create-user-account', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          role,
          phone,
          password,
          sendEmailInvite,
          department,
          position
        })
      });

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');
      let result: { error?: string; message?: string } = {};
      if (isJson) {
        try {
          result = await response.json();
        } catch {
          setError('Invalid response from server. Please try again.');
          return;
        }
      } else {
        const text = await response.text();
        setError(
          response.ok
            ? 'Invalid response from server. Please try again.'
            : `Server error: ${response.status}. ${text?.slice(0, 80) || 'Please try again.'}`
        );
        return;
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      setSuccess(result.message ?? 'User created successfully.');
      
      // Reset form
      setEmail("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setDepartment("");
      setPosition("");
      setPassword("");
      setConfirmPassword("");
      
    } catch (e: any) {
      setError(`Failed to create user: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-semibold">Add User Account</h1>
            <p className="text-white/70 text-sm mt-1">
              {schoolInfo ? `Creating account for ${schoolInfo.name}` : "Create new user account"}
            </p>
          </div>
          <button 
            className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" 
            onClick={() => router.push('/dashboard/admin')}
          >
            Back to Dashboard
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-4 py-3">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 text-green-200 px-4 py-3">
            {success}
          </div>
        )}

        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6"
        >
          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-white text-lg font-medium mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white/70 text-sm mb-2">First Name *</label>
                  <input 
                    className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/50 px-3 py-2 focus:border-blue-500 focus:outline-none" 
                    placeholder="Enter first name" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Last Name *</label>
                  <input 
                    className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/50 px-3 py-2 focus:border-blue-500 focus:outline-none" 
                    placeholder="Enter last name" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Email Address *</label>
                  <input 
                    type="email"
                    className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/50 px-3 py-2 focus:border-blue-500 focus:outline-none" 
                    placeholder="name@example.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                  />
                    <p className="text-xs text-blue-300 mt-1">
                    Enter the person&apos;s real email address (used for login and invitations).
                    </p>
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
                  <label className="block text-white/70 text-sm mb-2">Role *</label>
                  <select 
                    className="w-full rounded-lg border border-white/10 bg-white text-black px-3 py-2 focus:border-blue-500 focus:outline-none"
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="admin">Admin</option>
                    <option value="librarian">Librarian</option>
                    <option value="accountant">Accountant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Department</label>
                  <input 
                    className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/50 px-3 py-2 focus:border-blue-500 focus:outline-none" 
                    placeholder="Enter department" 
                    value={department} 
                    onChange={(e) => setDepartment(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Position</label>
                  <input 
                    className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/50 px-3 py-2 focus:border-blue-500 focus:outline-none" 
                    placeholder="Enter position/title" 
                    value={position} 
                    onChange={(e) => setPosition(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Login Credentials */}
            <div>
              <h3 className="text-white text-lg font-medium mb-4">Login Credentials</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    id="sendEmailInvite"
                    checked={sendEmailInvite}
                    onChange={(e) => setSendEmailInvite(e.target.checked)}
                    className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500"
                  />
                  <label htmlFor="sendEmailInvite" className="text-white/70 text-sm">
                    Send email invite (user will set their own password)
                  </label>
                </div>
                
                {!sendEmailInvite && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Password *</label>
                      <div className="relative">
                      <input 
                          type={showPassword ? "text" : "password"}
                          className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/50 px-3 py-2 pr-10 focus:border-blue-500 focus:outline-none" 
                        placeholder="Enter password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                      />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/70"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? "👁️‍🗨️" : "👁️"}
                        </button>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <input 
                          type="checkbox" 
                          id="showPassword"
                          checked={showPassword}
                          onChange={(e) => setShowPassword(e.target.checked)}
                          className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500"
                        />
                        <label htmlFor="showPassword" className="text-white/70 text-xs">
                          Show password
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm mb-2">Confirm Password *</label>
                      <div className="relative">
                      <input 
                          type={showConfirmPassword ? "text" : "password"}
                          className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/50 px-3 py-2 pr-10 focus:border-blue-500 focus:outline-none" 
                        placeholder="Confirm password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                      />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white/70"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? "👁️‍🗨️" : "👁️"}
                        </button>
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <input 
                          type="checkbox" 
                          id="showConfirmPassword"
                          checked={showConfirmPassword}
                          onChange={(e) => setShowConfirmPassword(e.target.checked)}
                          className="rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500"
                        />
                        <label htmlFor="showConfirmPassword" className="text-white/70 text-xs">
                          Show password
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
        </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button 
                className="flex-1 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
                disabled={saving} 
                onClick={save}
              >
                {saving ? "Creating Account..." : "Create User Account"}
              </button>
              <button 
                className="px-4 py-3 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors" 
                onClick={() => router.push('/dashboard/admin')}
              >
                Cancel
              </button>
          </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}



