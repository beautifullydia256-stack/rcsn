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
        .select("name, school_code")
        .eq("school_id", data.school_id)
        .single();
      
      if (schoolError) {
        console.error('School data error:', schoolError);
        setError(`Failed to load school data: ${schoolError.message}`);
        return;
      }
      setSchoolInfo(schoolData);
      
      // Generate school code from name if school_code column doesn't exist
      let schoolCode = schoolData?.school_code;
      if (!schoolCode && schoolData?.name) {
        schoolCode = schoolData.name.toLowerCase().replace(/\s+/g, '').substring(0, 8);
      }
      if (!schoolCode) {
        schoolCode = "demo";
      }
      
      setSchoolCode(schoolCode);
      console.log('School data loaded:', schoolData);
      console.log('School code set to:', schoolCode);
    };
    run();
  }, [router]);

  // Generate email when school code is loaded and names are available
  useEffect(() => {
    if (schoolCode && firstName && lastName) {
      const generatedEmail = generateEmail(firstName, lastName);
      setEmail(generatedEmail);
    }
  }, [schoolCode, firstName, lastName]);

  // Generate email from first name, last name and school code
  const generateEmail = (first: string, last: string) => {
    if (!first.trim() || !last.trim()) {
      console.log('Email generation failed: Missing names', { first, last });
      return "";
    }
    
    if (!schoolCode) {
      console.log('Email generation failed: Missing school code', { schoolCode });
      return "";
    }
    
    const firstLower = first.trim().toLowerCase();
    const lastLower = last.trim().toLowerCase();
    const generatedEmail = `${firstLower}${lastLower}@${schoolCode}.sch`;
    
    console.log('Generated email:', generatedEmail);
    return generatedEmail;
  };

  // Handle name changes and auto-generate email
  const handleFirstNameChange = (newFirstName: string) => {
    setFirstName(newFirstName);
    const generatedEmail = generateEmail(newFirstName, lastName);
    setEmail(generatedEmail);
  };

  const handleLastNameChange = (newLastName: string) => {
    setLastName(newLastName);
    const generatedEmail = generateEmail(firstName, newLastName);
    setEmail(generatedEmail);
  };

  const validateForm = () => {
    // Generate email if not already generated
    if (!email && firstName && lastName && schoolCode) {
      const generatedEmail = generateEmail(firstName, lastName);
      setEmail(generatedEmail);
    }
    
    if (!email || !firstName || !lastName || !phone) {
      setError("Please fill in all required fields");
      return false;
    }
    
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
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
    
    console.log('Form data before validation:', { firstName, lastName, email, phone, schoolCode });
    
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      // Call API endpoint to create user (server-side with service role)
      const response = await fetch('/api/admin/create-user-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      setSuccess(result.message);
      
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
                    onChange={(e) => handleFirstNameChange(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Last Name *</label>
                  <input 
                    className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/50 px-3 py-2 focus:border-blue-500 focus:outline-none" 
                    placeholder="Enter last name" 
                    value={lastName} 
                    onChange={(e) => handleLastNameChange(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm mb-2">Email Address *</label>
                  <input 
                    type="email"
                    className="w-full rounded-lg border border-white/10 bg-white/5 text-white px-3 py-2 cursor-not-allowed" 
                    placeholder={email || "Email will be auto-generated"} 
                    value={email} 
                    readOnly
                  />
                  <p className="text-xs text-blue-300 mt-1">
                    💡 Email will be auto-generated as: {email || `firstname+lastname@${schoolCode}.sch`}
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



