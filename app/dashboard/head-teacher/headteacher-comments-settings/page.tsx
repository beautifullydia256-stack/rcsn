"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

interface HeadteacherCommentRule {
  id?: string;
  min_percent: number;
  max_percent: number;
  comment_text: string;
}

export default function HeadteacherCommentsSettings() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [rules, setRules] = useState<HeadteacherCommentRule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
          .select('school_id, role')
          .eq('user_id', user.id)
          .single();

        if (!userData?.school_id || userData.role !== 'head_teacher') {
          router.push('/dashboard');
          return;
        }

        setSchoolId(userData.school_id);

        // Load existing headteacher comment rules
        const { data: existingRules, error: rulesError } = await supabase
          .from('headteacher_comments_settings')
          .select('*')
          .eq('school_id', userData.school_id)
          .order('min_percent', { ascending: true });

        if (rulesError) {
          console.error('Error loading rules:', rulesError);
          setError('Failed to load existing settings');
        } else {
          setRules(existingRules || []);
        }
      } catch (error) {
        console.error('Error:', error);
        setError('An error occurred while loading data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const addRule = () => {
    setRules([...rules, { min_percent: 0, max_percent: 100, comment_text: '' }]);
  };

  const updateRule = (index: number, field: keyof HeadteacherCommentRule, value: string | number) => {
    const updatedRules = [...rules];
    updatedRules[index] = { ...updatedRules[index], [field]: value };
    setRules(updatedRules);
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const saveSettings = async () => {
    if (!schoolId) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate rules
      for (const rule of rules) {
        if (rule.min_percent < 0 || rule.min_percent > 100) {
          throw new Error('Minimum percentage must be between 0 and 100');
        }
        if (rule.max_percent < 0 || rule.max_percent > 100) {
          throw new Error('Maximum percentage must be between 0 and 100');
        }
        if (rule.min_percent > rule.max_percent) {
          throw new Error('Minimum percentage cannot be greater than maximum percentage');
        }
        if (!rule.comment_text.trim()) {
          throw new Error('Comment text cannot be empty');
        }
      }

      // Check for overlapping ranges
      for (let i = 0; i < rules.length; i++) {
        for (let j = i + 1; j < rules.length; j++) {
          const rule1 = rules[i];
          const rule2 = rules[j];
          if (
            (rule1.min_percent <= rule2.max_percent && rule1.max_percent >= rule2.min_percent)
          ) {
            throw new Error('Comment ranges cannot overlap');
          }
        }
      }

      // Delete existing rules
      await supabase
        .from('headteacher_comments_settings')
        .delete()
        .eq('school_id', schoolId);

      // Insert new rules
      if (rules.length > 0) {
        const rulesToInsert = rules.map(rule => ({
          school_id: schoolId,
          min_percent: rule.min_percent,
          max_percent: rule.max_percent,
          comment_text: rule.comment_text.trim()
        }));

        const { error: insertError } = await supabase
          .from('headteacher_comments_settings')
          .insert(rulesToInsert);

        if (insertError) {
          throw new Error(insertError.message);
        }
      }

      setSuccess('Headteacher comments settings saved successfully!');
    } catch (error: any) {
      setError(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Headteacher's Comments Settings</h1>
                <p className="text-gray-600 mt-1">
                  Configure automatic headteacher comments based on student performance ranges
                </p>
              </div>
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800">{success}</p>
              </div>
            )}

            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Comment Ranges</h2>
                <button
                  onClick={addRule}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Range
                </button>
              </div>

              {rules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No comment ranges configured yet.</p>
                  <p className="text-sm mt-1">Click "Add Range" to create your first comment range.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rules.map((rule, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Min %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={rule.min_percent}
                            onChange={(e) => updateRule(index, 'min_percent', parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Max %
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={rule.max_percent}
                            onChange={(e) => updateRule(index, 'max_percent', parseInt(e.target.value) || 100)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div className="md:col-span-7">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Comment Text
                          </label>
                          <textarea
                            value={rule.comment_text}
                            onChange={(e) => updateRule(index, 'comment_text', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter the comment text for this percentage range..."
                          />
                        </div>

                        <div className="md:col-span-1">
                          <button
                            onClick={() => removeRule(index)}
                            className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={() => router.back()}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
