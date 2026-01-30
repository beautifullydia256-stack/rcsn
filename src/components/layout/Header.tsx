import { Menu, Bell, Search } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { GlassPanel } from '../Glass/GlassPanel';

export default function Header() {
  const { toggleSidebar, theme, toggleTheme } = useUIStore();

  return (
    <GlassPanel
      variant="normal"
      rounded="none"
      className="sticky top-0 z-30 border-b border-white/20"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={toggleSidebar}
          className="glass-subtle glass-rounded p-2 hover:glass-hover transition-all"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4">
          <div className="glass-subtle glass-rounded px-4 py-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-sm w-64"
            />
          </div>

          <button
            onClick={toggleTheme}
            className="glass-subtle glass-rounded p-2 hover:glass-hover transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <button
            className="glass-subtle glass-rounded p-2 hover:glass-hover transition-all relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
        </div>
      </div>
    </GlassPanel>
  );
}




