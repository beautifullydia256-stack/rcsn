import { Outlet } from 'react-router-dom';

/** Parent routes share a dark shell so sub-pages match the portal dashboard (admin/teacher-style). */
export default function ParentLayout() {
  return (
    <div
      className="min-h-screen bg-[#07090f] text-[#e8eeff] antialiased"
      data-theme="dark"
      data-layout="parent-portal"
    >
      <Outlet />
    </div>
  );
}
