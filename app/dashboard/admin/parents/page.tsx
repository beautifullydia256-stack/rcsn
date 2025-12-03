"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UserPlus, Search, Users, Trash2, Mail, Phone, GraduationCap, User } from "lucide-react";

interface Parent {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone: string;
  student_id: string;
  student_name?: string;
  student_class?: string;
  created_at: string;
}

export default function ParentsPage() {
  const router = useRouter();
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const loadParents = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: userData } = await supabase
          .from("users")
          .select("school_id, role")
          .eq("user_id", user.id)
          .single();

        if (!userData?.school_id) {
          router.push("/login");
          return;
        }

        // Load parents with their linked students
        const { data: parentsData, error } = await supabase
          .from("parents")
          .select(`
            id,
            user_id,
            name,
            email,
            phone,
            student_id,
            created_at,
            students (
              name,
              current_class
            )
          `)
          .eq("school_id", userData.school_id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading parents:", error);
        } else {
          const formattedParents = (parentsData || []).map((p: any) => ({
            ...p,
            student_name: p.students?.name || "Unknown",
            student_class: p.students?.current_class || "N/A"
          }));
          setParents(formattedParents);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadParents();
  }, [router]);

  const filteredParents = useMemo(() => {
    if (!searchQuery.trim()) return parents;
    
    const query = searchQuery.toLowerCase();
    return parents.filter(
      (p) =>
        p.name?.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.phone?.includes(query) ||
        p.student_name?.toLowerCase().includes(query)
    );
  }, [parents, searchQuery]);

  const handleDelete = async (parentId: string, parentName: string) => {
    if (!confirm(`Are you sure you want to remove ${parentName}? This will not delete their login if they have one.`)) {
      return;
    }

    setDeleting(parentId);
    try {
      const { error } = await supabase
        .from("parents")
        .delete()
        .eq("id", parentId);

      if (error) throw error;

      setParents((prev) => prev.filter((p) => p.id !== parentId));
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-white/70 text-sm">Loading parents...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Parents & Guardians</h1>
          <p className="text-white/70 text-sm mt-1">
            Manage parent accounts and their linked students
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/admin/parents/add")}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add Parent
        </button>
      </div>

      {/* Stats Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-blue-400/20 bg-blue-500/10 backdrop-blur-md p-4 mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-white/60 text-sm">Total Parents</p>
            <p className="text-2xl font-bold text-white">{parents.length}</p>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
        <input
          type="text"
          placeholder="Search by name, email, phone, or student name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none"
        />
      </div>

      {/* Parents List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden"
      >
        {filteredParents.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-white/70 font-medium mb-1">No parents found</h3>
            <p className="text-white/50 text-sm mb-4">
              {searchQuery
                ? "Try adjusting your search"
                : "Get started by adding your first parent"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => router.push("/dashboard/admin/parents/add")}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                Add Parent
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredParents.map((parent) => (
              <div
                key={parent.id}
                className="p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-lg">
                      {parent.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium truncate">
                          {parent.name || "Unnamed Parent"}
                        </h3>
                        {parent.user_id && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-400/30">
                            <User className="w-3 h-3" />
                            Has Login
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {parent.email}
                        </span>
                        {parent.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {parent.phone}
                          </span>
                        )}
                      </div>

                      {/* Linked Student */}
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <GraduationCap className="w-4 h-4 text-purple-400" />
                        <span className="text-white/70">
                          Child: <span className="text-white">{parent.student_name}</span>
                          {parent.student_class && (
                            <span className="text-white/50 ml-1">({parent.student_class})</span>
                          )}
                        </span>
                      </div>

                      <p className="text-xs text-white/40 mt-1">
                        Added {new Date(parent.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleDelete(parent.id, parent.name)}
                    disabled={deleting === parent.id}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Remove parent"
                  >
                    {deleting === parent.id ? (
                      <div className="w-5 h-5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Footer info */}
      {filteredParents.length > 0 && (
        <p className="text-center text-white/40 text-sm mt-4">
          Showing {filteredParents.length} of {parents.length} parents
        </p>
      )}
    </>
  );
}


