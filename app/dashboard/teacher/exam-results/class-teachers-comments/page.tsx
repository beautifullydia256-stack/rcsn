"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface CommentRule {
  id?: string;
  school_id: string;
  class_name: string;
  min_percent: number;
  max_percent: number;
  comment_text: string;
  created_at?: string;
  updated_at?: string;
}

export default function ClassTeachersCommentsPage() {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [commentRules, setCommentRules] = useState<CommentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState({
    min_percent: 0,
    max_percent: 40,
    comment_text: ""
  });
  const [editingRule, setEditingRule] = useState<CommentRule | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: userData } = await supabase
          .from('users')
          .select('school_id')
          .eq('user_id', user.id)
          .single();

        if (!userData?.school_id) {
          router.push('/login');
          return;
        }

        setSchoolId(userData.school_id);

        // Load classes from students
        const { data: studentsData } = await supabase
          .from('students')
          .select('current_class')
          .eq('school_id', userData.school_id)
          .eq('status', 'active');

        const uniqueClasses = Array.from(new Set(studentsData?.map(s => s.current_class) || []));
        setClasses(uniqueClasses.sort());

        if (uniqueClasses.length > 0) {
          setSelectedClass(uniqueClasses[0]);
        }

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  useEffect(() => {
    if (schoolId && selectedClass) {
      loadCommentRules();
    }
  }, [schoolId, selectedClass]);

  const loadCommentRules = async () => {
    if (!schoolId || !selectedClass) return;

    try {
      const { data, error } = await supabase
        .from('report_comment_rules')
        .select('*')
        .eq('school_id', schoolId)
        .eq('class_name', selectedClass)
        .order('min_percent', { ascending: true });

      if (error) throw error;

      // If no school-specific rules, fall back to global defaults (read-only)
      if (!data || data.length === 0) {
        const { data: defaults, error: defaultsError } = await supabase
          .from('report_comment_rules_defaults')
          .select('min_percent, max_percent, comment_text, class_name, active')
          .eq('active', true)
          .order('min_percent', { ascending: true });

        if (defaultsError) throw defaultsError;

        const mapped = (defaults || []).map((d) => ({
          school_id: schoolId,
          class_name: selectedClass,
          min_percent: d.min_percent as number,
          max_percent: d.max_percent as number,
          comment_text: d.comment_text as string,
        } as CommentRule));

        setCommentRules(mapped);
        return;
      }

      setCommentRules(data || []);
    } catch (error) {
      console.error('Error loading comment rules:', error);
    }
  };

  const handleAddRule = async () => {
    if (!schoolId || !selectedClass || !newRule.comment_text.trim()) return;

    // Validate range
    if (newRule.min_percent >= newRule.max_percent) {
      alert('Min % must be less than Max %');
      return;
    }

    // Check for overlapping ranges
    const hasOverlap = commentRules.some(rule => 
      (newRule.min_percent >= rule.min_percent && newRule.min_percent < rule.max_percent) ||
      (newRule.max_percent > rule.min_percent && newRule.max_percent <= rule.max_percent) ||
      (newRule.min_percent <= rule.min_percent && newRule.max_percent >= rule.max_percent)
    );

    if (hasOverlap) {
      alert('This range overlaps with an existing rule');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('report_comment_rules')
        .insert({
          school_id: schoolId,
          class_name: selectedClass,
          min_percent: newRule.min_percent,
          max_percent: newRule.max_percent,
          comment_text: newRule.comment_text.trim()
        });

      if (error) throw error;

      setNewRule({ min_percent: 0, max_percent: 40, comment_text: "" });
      setShowAddForm(false);
      loadCommentRules();
    } catch (error) {
      console.error('Error adding comment rule:', error);
      alert('Failed to add comment rule');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRule = async (rule: CommentRule) => {
    if (!rule.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('report_comment_rules')
        .update({
          min_percent: rule.min_percent,
          max_percent: rule.max_percent,
          comment_text: rule.comment_text
        })
        .eq('id', rule.id);

      if (error) throw error;

      setEditingRule(null);
      loadCommentRules();
    } catch (error) {
      console.error('Error updating comment rule:', error);
      alert('Failed to update comment rule');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this comment rule?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('report_comment_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      loadCommentRules();
    } catch (error) {
      console.error('Error deleting comment rule:', error);
      alert('Failed to delete comment rule');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">Class Teachers Comments</h1>
              <p className="text-white/70">Set up comment rules based on student performance percentages</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              ← Back
            </button>
          </div>

          {/* Class Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/80 mb-2">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full max-w-xs px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {classes.map((className) => (
                <option key={className} value={className} className="bg-gray-800">
                  {className}
                </option>
              ))}
            </select>
          </div>

          {/* Add New Rule Form */}
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10"
            >
              <h3 className="text-lg font-semibold text-white mb-4">Add New Comment Rule</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Min %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newRule.min_percent}
                    onChange={(e) => setNewRule(prev => ({ ...prev, min_percent: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Max %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newRule.max_percent}
                    onChange={(e) => setNewRule(prev => ({ ...prev, max_percent: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1">Comment</label>
                  <input
                    type="text"
                    value={newRule.comment_text}
                    onChange={(e) => setNewRule(prev => ({ ...prev, comment_text: e.target.value }))}
                    placeholder="Enter comment text"
                    className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddRule}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add Rule"}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* Add Range Button */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mb-6 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Add Range
            </button>
          )}

          {/* Comment Rules List */}
          <div className="space-y-4">
            {commentRules.length === 0 ? (
              <div className="text-center py-8 text-white/60">
                No comment rules set for {selectedClass}. Click "Add Range" to create rules.
              </div>
            ) : (
              commentRules.map((rule) => (
                <motion.div
                  key={rule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-white/5 rounded-lg border border-white/10"
                >
                  {editingRule?.id === rule.id ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">Min %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editingRule.min_percent}
                          onChange={(e) => setEditingRule(prev => prev ? { ...prev, min_percent: parseInt(e.target.value) || 0 } : null)}
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">Max %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editingRule.max_percent}
                          onChange={(e) => setEditingRule(prev => prev ? { ...prev, max_percent: parseInt(e.target.value) || 0 } : null)}
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white/80 mb-1">Comment</label>
                        <input
                          type="text"
                          value={editingRule.comment_text}
                          onChange={(e) => setEditingRule(prev => prev ? { ...prev, comment_text: e.target.value } : null)}
                          className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div>
                        <span className="text-white/60 text-sm">Range:</span>
                        <span className="text-white font-medium ml-2">{rule.min_percent}% - {rule.max_percent}%</span>
                      </div>
                      <div>
                        <span className="text-white/60 text-sm">Comment:</span>
                        <span className="text-white ml-2">{rule.comment_text}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id!)}
                          disabled={saving}
                          className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm transition-colors disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {editingRule?.id === rule.id && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleUpdateRule(editingRule)}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingRule(null)}
                        className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
