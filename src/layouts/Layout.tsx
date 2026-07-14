import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, History as HistoryIcon, Settings, LogOut } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function Layout() {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { name: 'Pick', path: '/', icon: LayoutDashboard },
    { name: 'Students', path: '/students', icon: Users },
    { name: 'History', path: '/history', icon: HistoryIcon },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-[#f5f5f5] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col border-r border-[#1a1a1a] bg-[#0d0d0d] py-8 px-4 shrink-0">
        {/* Brand */}
        <div className="px-3 mb-10">
          <span className="font-display text-xl text-white tracking-tight">Picker</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-white text-black'
                    : 'text-[#666] hover:text-[#eee] hover:bg-[#161616]'
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#444] hover:text-red-400 hover:bg-[#1a1010] transition-all duration-150"
        >
          <LogOut size={16} strokeWidth={1.8} />
          Logout
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto py-10 px-8 h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
