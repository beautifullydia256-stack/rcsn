"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";

export default function EditTeacherPage() {
  const router = useRouter();
  const params = useParams();
  const teacherId = Array.isArray(params?.teacher_id) ? params?.teacher_id[0] : (params?.teacher_id as string);

  const [teacher, setTeacher] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    const loadTeacher = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return router.push('/login');

        const { data: teacherData, error } = await supabase
          .from('teachers')
          .select('*')
          .eq('teacher_id', teacherId)
          .single();

        if (error) {
          console.error('Error loading teacher:', error);
          setError('Failed to load teacher data');
          return;
        }

        if (!teacherData) {
          setError('Teacher not found');
          return;
        }

        setTeacher(teacherData);
        setName(teacherData.name || '');
        setEmail(teacherData.email || '');
        setPhone(teacherData.phone || '');
        setSubject(teacherData.subject || '');
        setQualification(teacherData.qualification || '');
        setExperience(teacherData.experience || '');
        setAddress(teacherData.address || '');
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load teacher data');
      } finally {
        setLoading(false);
      }
    };

    if (teacherId) {
      loadTeacher();
    }
  }, [teacherId, router]);

  const handleSave = async () => {
    if (!teacher) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updateError } = await supabase
        .from('teachers')
        .update({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          subject: subject.trim(),
          qualification: qualification.trim(),
          experience: experience.trim(),
          address: address.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('teacher_id', teacherId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess('Teacher updated successfully!');
      setTimeout(() => {
        router.push(`/dashboard/admin/teachers/${teacherId}`);
      }, 1500);
    } catch (err: any) {
      console.error('Error updating teacher:', err);
      setError(err.message || 'Failed to update teacher');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-lg">Loading teacher data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !teacher) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-red-400 text-lg mb-4">{error}</div>
            <button 
              onClick={() => router.push('/dashboard/admin/teachers')}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
            >
              Back to Teachers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white text-xl">✏️</div>
            <h1 className="text-white text-2xl font-semibold">Edit Teacher</h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => router.push(`/dashboard/admin/teachers/${teacherId}`)}
              className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-green-600/10 border border-green-500/30 text-green-200"
          >
            {success}
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-red-600/10 border border-red-500/30 text-red-200"
          >
            {error}
          </motion.div>
        )}

        {/* Edit Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-white font-medium text-lg mb-4">Basic Information</h3>
              
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter teacher's full name"
                  required
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="teacher@school.com"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+256 XXX XXX XXX"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mathematics, English, etc."
                />
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-white font-medium text-lg mb-4">Professional Information</h3>
              
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Qualification</label>
                <input
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Bachelor of Education, etc."
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Years of Experience</label>
                <input
                  type="text"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="5 years"
                />
              </div>

              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">Address</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Teacher's residential address"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
