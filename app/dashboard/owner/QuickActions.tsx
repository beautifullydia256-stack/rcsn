"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/src/lib/supabase";

export function QuickActions() {
  const [busy, setBusy] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showJob, setShowJob] = useState(false);
  const [uploadForm, setUploadForm] = useState<{ title: string; description: string; file: File | null }>({ title: "", description: "", file: null });
  const [jobForm, setJobForm] = useState<{ title: string; location: string; description: string }>({ title: "", location: "", description: "" });

  const markDormantSchools = async () => {
    setBusy("dormant");
    await supabase.from("schools").update({ status: "dormant" }).lte("student_count", 0);
    setBusy(null);
  };

  const doUploadLibrary = async () => {
    if (!uploadForm.file || !uploadForm.title) return;
    setBusy("upload");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userEmail = auth.user?.email || "owner";
      const filePath = `library/${Date.now()}-${uploadForm.file.name}`;
      const { error: upErr } = await supabase.storage.from("library").upload(filePath, uploadForm.file);
      if (upErr) throw upErr;
      const { data: pub } = await supabase.storage.from("library").getPublicUrl(filePath);
      const fileUrl = pub?.publicUrl || "";
      await supabase.from("library").insert({ title: uploadForm.title, description: uploadForm.description, file_url: fileUrl, uploaded_by: userEmail });
      setShowUpload(false);
      setUploadForm({ title: "", description: "", file: null });
      alert("Uploaded");
    } catch (e) {
      alert("Upload failed. Ensure a 'library' storage bucket exists.");
    } finally {
      setBusy(null);
    }
  };

  const doPostJob = async () => {
    if (!jobForm.title) return;
    setBusy("job");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const postedBy = auth.user?.email || "owner";
      await supabase.from("jobs").insert({ title: jobForm.title, location: jobForm.location, description: jobForm.description, posted_by: postedBy, status: "Pending" });
      setShowJob(false);
      setJobForm({ title: "", location: "", description: "" });
      alert("Job posted");
    } catch (e) {
      alert("Job post failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4">
      <div className="text-sm font-medium mb-3 text-white">Quick Actions</div>
      <div className="flex flex-wrap gap-2">
        <button className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => setShowUpload(true)}>Upload Library Content</button>
        <button className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => setShowJob(true)}>Add Job Posting</button>
        <button className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => alert("Generate Subscription Report")}>Subscription Report</button>
        <button className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 transition-transform hover:scale-105 text-white text-sm" onClick={() => alert("Show Billing Logs")}>Billing Logs</button>
        <button className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 transition-transform hover:scale-105 text-white text-sm disabled:opacity-50" disabled={busy==="dormant"} onClick={markDormantSchools}>
          {busy==="dormant"?"Marking...":"Mark Dormant Schools"}
        </button>
      </div>

      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-md rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-xl p-4">
              <div className="text-white font-medium mb-2">Upload Library Content</div>
              <div className="space-y-3">
                <input className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Title" value={uploadForm.title} onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })} />
                <textarea className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Description" value={uploadForm.description} onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })} />
                <input type="file" className="w-full text-white" onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => setShowUpload(false)}>Cancel</button>
                <button className="px-3 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-50" disabled={busy==="upload"} onClick={doUploadLibrary}>{busy==="upload"?"Uploading...":"Upload"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showJob && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4">
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="w-full max-w-md rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-xl p-4">
              <div className="text-white font-medium mb-2">Add Job Posting</div>
              <div className="space-y-3">
                <input className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Title" value={jobForm.title} onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })} />
                <input className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Location" value={jobForm.location} onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })} />
                <textarea className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-white/70 px-3 py-2" placeholder="Description" value={jobForm.description} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className="px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20" onClick={() => setShowJob(false)}>Cancel</button>
                <button className="px-3 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-50" disabled={busy==="job"} onClick={doPostJob}>{busy==="job"?"Saving...":"Save"}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}



