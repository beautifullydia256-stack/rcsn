"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { UserPlus, Search, Shield, BookOpen, Calculator, Trash2, Mail, Phone, Building2 } from "lucide-react";

interface UserAccount {
  user_id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  department?: string;
  position?: string;
  created_at: string;
  last_sign_in_at?: string;
}

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const loadAccounts = async () => {
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

        // Only admins can view this page
        if (userData.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        // Load all staff accounts (admin, librarian, accountant)
        const { data: accountsData, error } = await supabase
          .from("users")
          .select("*")
          .eq("school_id", userData.school_id)
          .in("role", ["admin", "librarian", "accountant"])
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading accounts:", error);
        } else {
          setAccounts(accountsData || []);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadAccounts();
  }, [router]);

  const filteredAccounts = useMemo(() => {
    let result = accounts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.name?.toLowerCase().includes(query) ||
          a.email?.toLowerCase().includes(query) ||
          a.department?.toLowerCase().includes(query)
      );
    }

    if (roleFilter) {
      result = result.filter((a) => a.role === roleFilter);
    }

    return result;
  }, [accounts, searchQuery, roleFilter]);

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete the account for ${email}? This action cannot be undone.`)) {
      return;
    }

    setDeleting(userId);
    try {
      // Call API to delete user
      const response = await fetch("/api/admin/delete-user", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      // Remove from local state
      setAccounts((prev) => prev.filter((a) => a.user_id !== userId));
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4" />;
      case "librarian":
        return <BookOpen className="w-4 h-4" />;
      case "accountant":
        return <Calculator className="w-4 h-4" />;
      default:
        return <Shield className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-500/20 text-purple-300 border-purple-400/30";
      case "librarian":
        return "bg-blue-500/20 text-blue-300 border-blue-400/30";
      case "accountant":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-400/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-400/30";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-white/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-white/70 text-sm">Loading accounts...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Staff Accounts</h1>
          <p className="text-white/70 text-sm mt-1">
            Manage admin, librarian, and accountant accounts
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/admin/accounts/add")}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Add Account
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-purple-400/20 bg-purple-500/10 backdrop-blur-md p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Admins</p>
              <p className="text-xl font-bold text-white">
                {accounts.filter((a) => a.role === "admin").length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-blue-400/20 bg-blue-500/10 backdrop-blur-md p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Librarians</p>
              <p className="text-xl font-bold text-white">
                {accounts.filter((a) => a.role === "librarian").length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 backdrop-blur-md p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Calculator className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white/60 text-sm">Accountants</p>
              <p className="text-xl font-bold text-white">
                {accounts.filter((a) => a.role === "accountant").length}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="Search by name, email, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:border-purple-500 focus:outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white focus:border-purple-500 focus:outline-none"
        >
          <option value="" className="bg-slate-800">All Roles</option>
          <option value="admin" className="bg-slate-800">Admin</option>
          <option value="librarian" className="bg-slate-800">Librarian</option>
          <option value="accountant" className="bg-slate-800">Accountant</option>
        </select>
      </div>

      {/* Accounts List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden"
      >
        {filteredAccounts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-white/30" />
            </div>
            <h3 className="text-white/70 font-medium mb-1">No accounts found</h3>
            <p className="text-white/50 text-sm mb-4">
              {searchQuery || roleFilter
                ? "Try adjusting your search or filters"
                : "Get started by adding your first staff account"}
            </p>
            {!searchQuery && !roleFilter && (
              <button
                onClick={() => router.push("/dashboard/admin/accounts/add")}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
              >
                Add Account
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredAccounts.map((account) => (
              <div
                key={account.user_id}
                className="p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                      {account.name?.charAt(0)?.toUpperCase() || "?"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium truncate">
                          {account.name || "Unnamed User"}
                        </h3>
                        <span
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getRoleColor(
                            account.role
                          )}`}
                        >
                          {getRoleIcon(account.role)}
                          {account.role}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {account.email}
                        </span>
                        {account.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {account.phone}
                          </span>
                        )}
                        {account.department && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {account.department}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-white/40 mt-1">
                        Added {new Date(account.created_at).toLocaleDateString()}
                        {account.last_sign_in_at &&
                          ` • Last login: ${new Date(
                            account.last_sign_in_at
                          ).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => handleDelete(account.user_id, account.email)}
                    disabled={deleting === account.user_id}
                    className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete account"
                  >
                    {deleting === account.user_id ? (
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
      {filteredAccounts.length > 0 && (
        <p className="text-center text-white/40 text-sm mt-4">
          Showing {filteredAccounts.length} of {accounts.length} accounts
        </p>
      )}
    </>
  );
}


