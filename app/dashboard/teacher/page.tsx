/**
 * Legacy Next.js route: production is the Vite SPA (`dist`). Use `/dashboard/teacher` in the Vite app
 * (`src/pages/teacher/`). This page avoids maintaining a second full teacher dashboard in Next.
 */
export default function TeacherDashboardDeprecatedNotice() {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 p-8 text-center text-slate-700 dark:text-slate-200">
      <p className="text-lg font-medium">Teacher dashboard</p>
      <p className="max-w-md text-sm opacity-90">
        The active teacher UI is the PwezaCore web app (Vite). If you reached this page from a dev server,
        open the same path in the Vite app, or see <code className="rounded bg-black/5 px-1.5 py-0.5 text-xs">src/pages/teacher/</code> in the repo.
      </p>
      <a
        className="text-sm font-medium text-emerald-700 underline underline-offset-2 hover:opacity-90 dark:text-emerald-400"
        href="/dashboard/teacher"
      >
        Go to /dashboard/teacher
      </a>
      </div>
  );
}
