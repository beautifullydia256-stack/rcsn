"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";

export default function ExamSetsPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolType, setSchoolType] = useState<'Nursery/Primary' | 'Secondary' | null>(null);
  const [examSets, setExamSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTerm, setCurrentTerm] = useState<{year: number; term: number} | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [term, setTerm] = useState<number>(1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [targetClasses, setTargetClasses] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const autoCopyExamSetsFromPreviousYear = async (currentYear: number, currentExamSets: any[]) => {
    if (!schoolId) return;
    
    // Check if there are any exam sets for the current year
    const hasCurrentYearExamSets = currentExamSets.some(es => es.year === currentYear);
    
    if (hasCurrentYearExamSets) {
      // Already have exam sets for current year, no need to copy
      return;
    }
    
    // Get exam sets from previous year
    const { data: previousYearExamSets, error } = await supabase
      .from('exam_sets')
      .select('*')
      .eq('school_id', schoolId)
      .eq('year', currentYear - 1)
      .order('term', { ascending: true });
    
    if (error || !previousYearExamSets || previousYearExamSets.length === 0) {
      // No previous year exam sets to copy
      return;
    }
    
    // Copy each exam set to current year
    const newExamSets = previousYearExamSets.map(es => ({
      school_id: schoolId,
      name: es.name,
      description: es.description,
      term: es.term,
      year: currentYear,
      target_classes: es.target_classes,
      is_active: false, // Start as inactive
      active_for_input: false // Start as not active for input
    }));
    
    const { error: insertError } = await supabase
      .from('exam_sets')
      .insert(newExamSets);
    
    if (insertError) {
      console.error('Failed to auto-copy exam sets:', insertError);
      return;
    }
    
    // Reload exam sets to show the newly copied ones
    const { data: updatedData } = await supabase
      .from('exam_sets')
      .select('*')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('term', { ascending: true })
      .order('name');
    
    setExamSets(updatedData || []);
  };

  const classOptions = (() => {
    const opts: string[] = [];
    if (schoolType === 'Nursery/Primary') {
      opts.push('Nursery', 'Middle Class', 'Top Class');
      for (let i = 1; i <= 7; i++) opts.push(`Primary ${i}`);
    } else if (schoolType === 'Secondary') {
      for (let i = 1; i <= 6; i++) opts.push(`Senior ${i}`);
    }
    return opts;
  })();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
      if (!u?.school_id) return;
      setSchoolId(u.school_id);
      const { data: sch } = await supabase.from('schools').select('type').eq('school_id', u.school_id).single();
      setSchoolType((sch?.type as any) || null);
    };
    init();
  }, []);

  useEffect(() => {
    const loadExamSets = async () => {
      if (!schoolId) return;
      setLoading(true);
      
      // Load exam sets
      const { data, error } = await supabase
        .from('exam_sets')
        .select('*')
        .eq('school_id', schoolId) // Application-level school filtering
        .order('year', { ascending: false })
        .order('term', { ascending: true })
        .order('name');
      if (error) setError(error.message);
      setExamSets(data || []);
      
      // Load current term
      const { data: termsData, error: termsError } = await supabase
        .from('school_terms')
        .select('*')
        .eq('school_id', schoolId)
        .order('year', { ascending: false })
        .order('term', { ascending: true });
      
      if (!termsError && termsData) {
        // Detect current term by date window
        const todayStr = new Date().toISOString().slice(0,10);
        const current = termsData.find((r: any) => 
          r.start_date ? 
            (r.start_date <= todayStr && r.end_date >= todayStr) : 
            (r.end_date >= todayStr) // If no start date, consider it current if end date is in future
        );
        if (current) {
          setCurrentTerm({ year: current.year, term: current.term });
          
          // Auto-copy exam sets from previous year if none exist for current year
          await autoCopyExamSetsFromPreviousYear(current.year, data || []);
        }
      }
      
      setLoading(false);
    };
    loadExamSets();
  }, [schoolId]);

  const saveExamSet = async () => {
    setError(null);
    if (!schoolId || !name.trim()) return;
    
    setSaving(true);
    const payload = {
      school_id: schoolId,
      name: name.trim(),
      description: description.trim() || null,
      term,
      year,
      target_classes: allClasses ? [] : targetClasses,
      is_active: true
    };

    const { error: insertError } = await supabase
      .from('exam_sets')
      .insert(payload);

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    // Reset form
    setName("");
    setDescription("");
    setTerm(1);
    setYear(new Date().getFullYear());
    setTargetClasses([]);
    setAllClasses(false);
    setShowForm(false);

    // Reload exam sets
    const { data } = await supabase
      .from('exam_sets')
      .select('*')
      .eq('school_id', schoolId) // Application-level school filtering
      .order('year', { ascending: false })
      .order('term', { ascending: true })
      .order('name');
    setExamSets(data || []);
  };

  const toggleClass = (className: string) => {
    if (targetClasses.includes(className)) {
      setTargetClasses(prev => prev.filter(c => c !== className));
    } else {
      setTargetClasses(prev => [...prev, className]);
    }
  };

  const deleteExamSet = async (id: string) => {
    // Find the exam set to check its term and year
    const examSet = examSets.find(es => es.id === id);
    if (!examSet) return;
    
    // Check if this exam set is for a previous term
    if (currentTerm) {
      const isPreviousTerm = examSet.year < currentTerm.year || 
        (examSet.year === currentTerm.year && examSet.term < currentTerm.term);
      
      if (isPreviousTerm) {
        setError('Cannot delete exam sets for previous terms.');
        return;
      }
    }
    
    if (!confirm('Are you sure you want to delete this exam set?')) return;
    
    const { error } = await supabase
      .from('exam_sets')
      .delete()
      .eq('id', id);
    
    if (error) {
      setError(error.message);
      return;
    }

    setExamSets(prev => prev.filter(es => es.id !== id));
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    // Find the exam set to check its term and year
    const examSet = examSets.find(es => es.id === id);
    if (!examSet) return;
    
    // Check if this exam set is for a previous term
    if (currentTerm) {
      const isPreviousTerm = examSet.year < currentTerm.year || 
        (examSet.year === currentTerm.year && examSet.term < currentTerm.term);
      
      if (isPreviousTerm) {
        setError('Cannot modify exam sets for previous terms.');
        return;
      }
    }
    
    const { error } = await supabase
      .from('exam_sets')
      .update({ is_active: !currentActive })
      .eq('id', id);
    
    if (error) {
      setError(error.message);
      return;
    }

    setExamSets(prev => prev.map(es => 
      es.id === id ? { ...es, is_active: !currentActive } : es
    ));
  };

  const toggleActiveForInput = async (id: string, currentActiveForInput: boolean) => {
    // Find the exam set to check its term and year
    const examSet = examSets.find(es => es.id === id);
    if (!examSet) return;
    
    // Check if this exam set is for a previous term
    if (currentTerm) {
      const isPreviousTerm = examSet.year < currentTerm.year || 
        (examSet.year === currentTerm.year && examSet.term < currentTerm.term);
      
      if (isPreviousTerm) {
        setError('Cannot modify exam sets for previous terms.');
        return;
      }
    }
    
    // If trying to turn off, check if any results exist
    if (currentActiveForInput) {
      const { data: results, error: resultsError } = await supabase
        .from('exam_results')
        .select('id')
        .eq('exam_set_id', id)
        .limit(1);
      
      if (resultsError) {
        setError('Failed to check existing results');
        return;
      }
      
      if (results && results.length > 0) {
        setError('Cannot turn off exam set. Teachers have already input results for this exam set.');
        return;
      }
    }

    const { error } = await supabase
      .from('exam_sets')
      .update({ active_for_input: !currentActiveForInput })
      .eq('id', id);
    
    if (error) {
      setError(error.message);
      return;
    }

    setExamSets(prev => prev.map(es => 
      es.id === id ? { ...es, active_for_input: !currentActiveForInput } : es
    ));
  };

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-2xl font-semibold">Exam Sets Management ({currentTerm?.year || 'Current Year'})</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
            >
              {showForm ? 'Cancel' : 'Create New Exam Set'}
            </button>
            <button
              onClick={() => router.push('/dashboard/admin')}
              className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-white hover:bg-white/15"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="text-white/80 text-sm">
          Create different exam sets for your school (e.g., Beginning of Term, Mid Term, End of Term). 
          Each set can be assigned to specific classes or all classes.
        </div>

        {/* Create new exam set form */}
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6"
          >
            <h3 className="text-white font-medium mb-4">Create New Exam Set</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Exam Set Name (e.g., Beginning of Term)"
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 placeholder:text-white/60 text-white"
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 placeholder:text-white/60 text-white"
              />
              <select
                value={term}
                onChange={(e) => setTerm(parseInt(e.target.value))}
                className="rounded-lg border border-white/10 bg-white text-black px-3 py-2"
              >
                <option value={1}>Term 1</option>
                <option value={2}>Term 2</option>
                <option value={3}>Term 3</option>
              </select>
              <input
                type="number"
                min={2020}
                max={2099}
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="rounded-lg border border-white/10 bg-white text-black px-3 py-2"
              />
            </div>
            
            {/* Class selection */}
            <div className="mt-4">
              <label className="flex items-center gap-2 text-white/80 text-sm mb-3">
                <input
                  type="checkbox"
                  checked={allClasses}
                  onChange={(e) => {
                    setAllClasses(e.target.checked);
                    if (e.target.checked) setTargetClasses([]);
                  }}
                  className="accent-blue-500"
                />
                Apply to all classes
              </label>
              
              {!allClasses && (
                <div className="flex flex-wrap gap-2">
                  {classOptions.map(className => (
                    <button
                      key={className}
                      type="button"
                      onClick={() => toggleClass(className)}
                      className={`px-3 py-1 rounded-lg border text-sm transition-colors ${
                        targetClasses.includes(className)
                          ? 'bg-blue-600/80 border-blue-400 text-white'
                          : 'bg-white/10 border-white/10 text-white/90 hover:bg-white/15'
                      }`}
                    >
                      {className}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-4">
              <button
                disabled={!schoolId || !name.trim() || saving || (!allClasses && targetClasses.length === 0)}
                onClick={saveExamSet}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white"
              >
                {saving ? 'Creating...' : 'Create Exam Set'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-500 text-white"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-200 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Exam sets list */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 overflow-x-auto"
        >
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-medium">Current Exam Sets</h3>
          </div>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b border-white/10">
                <th className="px-4 py-3 text-white/80">Name</th>
                <th className="px-4 py-3 text-white/80">Description</th>
                <th className="px-4 py-3 text-white/80">Term</th>
                <th className="px-4 py-3 text-white/80">Year</th>
                <th className="px-4 py-3 text-white/80">Classes</th>
                <th className="px-4 py-3 text-white/80">Status</th>
                <th className="px-4 py-3 text-white/80">Active for Input</th>
                <th className="px-4 py-3 text-white/80">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr:nth-child(even)]:bg-white/5">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-white/80">
                    Loading...
                  </td>
                </tr>
              ) : examSets.filter(es => currentTerm ? es.year === currentTerm.year : true).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-white/80">
                    No exam sets created for {currentTerm?.year || 'this year'} yet. Click "Create New Exam Set" to get started.
                  </td>
                </tr>
              ) : (
                examSets
                  .filter(es => currentTerm ? es.year === currentTerm.year : true)
                  .map(es => (
                  <tr key={es.id} className="border-b border-white/10">
                    <td className="px-4 py-3 text-white font-medium">{es.name}</td>
                    <td className="px-4 py-3 text-white/90">{es.description || '-'}</td>
                    <td className="px-4 py-3 text-white/90">Term {es.term}</td>
                    <td className="px-4 py-3 text-white/90">{es.year}</td>
                    <td className="px-4 py-3 text-white/90">
                      {es.target_classes.length === 0 ? (
                        <span className="text-green-300">All Classes</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {es.target_classes.slice(0, 3).map((className: string, idx: number) => (
                            <span key={idx} className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded text-xs">
                              {className}
                            </span>
                          ))}
                          {es.target_classes.length > 3 && (
                            <span className="px-2 py-1 bg-gray-600/20 text-gray-300 rounded text-xs">
                              +{es.target_classes.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(es.id, es.is_active)}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          es.is_active
                            ? 'bg-green-600 hover:bg-green-500 text-white'
                            : 'bg-gray-600 hover:bg-gray-500 text-white'
                        }`}
                      >
                        {es.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActiveForInput(es.id, es.active_for_input)}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          es.active_for_input
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : 'bg-gray-600 hover:bg-gray-500 text-white'
                        }`}
                      >
                        {es.active_for_input ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteExamSet(es.id)}
                        className="px-3 py-1 text-xs rounded bg-red-500 hover:bg-red-400 transition-transform hover:scale-105 text-white"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </motion.div>
      </div>
    </div>
  );
}

