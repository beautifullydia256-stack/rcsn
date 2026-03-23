import { Outlet } from 'react-router-dom';

/** Minimal layout so parent dashboard and messages can share nested routes. */
export default function ParentLayout() {
  return <Outlet />;
}
