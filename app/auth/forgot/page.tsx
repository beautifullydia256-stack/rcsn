'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function ForgotPasswordAdminGate() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="relative min-h-screen flex items-center justify-center p-6 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />

      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.25, scale: 1 }}
        transition={{ duration: 1.1 }}
        className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-600 blur-3xl"
      />
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 0.2, scale: 1 }}
        transition={{ duration: 1.3, delay: 0.05 }}
        className="pointer-events-none absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-indigo-600 blur-3xl"
      />

      <div className="relative w-full max-w-xl rounded-2xl bg-white/10 backdrop-blur-md shadow-2xl border border-white/10 p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-white">Password Reset</h1>
        <p className="mt-2 text-white/80">This page is restricted to School Admins.</p>

        <div className="mt-6 space-y-4 text-white/90">
          <p>
            If you are a <span className="font-semibold">School Admin</span>, proceed to reset your password from your email invitation/reset link or contact your platform owner to resend the admin invite.
          </p>
          <div className="rounded-lg border border-white/15 bg-white/5 p-4">
            <p className="text-sm text-white/80">
              Teachers, Students and Parents should use their respective reset options provided in their portals. If you reached this page by mistake, please return to the login screen.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link href="/login" className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-white/10 text-white border border-white/15 hover:bg-white/15 transition">
            Back to Login
          </Link>
        </div>
      </div>
    </motion.div>
  );
}


