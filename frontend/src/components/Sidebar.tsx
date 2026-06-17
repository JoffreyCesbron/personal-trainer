import { Link, useLocation } from "react-router-dom";

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  soon?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    group: "Training",
    items: [
      { label: "Dashboard",      href: "/",      icon: <IconDashboard /> },
      { label: "Context Graph",  href: "/graph", icon: <IconGraph /> },
      { label: "My Program",     icon: <IconProgram />,  soon: true },
      { label: "History",        icon: <IconHistory />,  soon: true },
    ],
  },
  {
    group: "Progress",
    items: [
      { label: "Stats",          icon: <IconStats />,    soon: true },
      { label: "Body metrics",   icon: <IconBody />,     soon: true },
      { label: "Personal bests", icon: <IconPR />,       soon: true },
    ],
  },
  {
    group: "Account",
    items: [
      { label: "Profile",        icon: <IconProfile />,  soon: true },
      { label: "Preferences",    icon: <IconSettings />, soon: true },
    ],
  },
];

export function Sidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="w-52 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
      {/* logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <p className="text-slate-900 font-bold text-sm tracking-wide">CoachOS</p>
        <p className="text-slate-400 text-xs mt-0.5">AI personal coaching</p>
      </div>

      {/* nav */}
      <nav className="flex-1 px-3 pt-4 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.group} className="mb-5">
            <p className="text-xs uppercase tracking-widest text-slate-400 mb-1 px-2">
              {group.group}
            </p>
            {group.items.map((item) => {
              const active = item.href === pathname;
              if (item.soon) {
                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-0.5 text-slate-300 cursor-not-allowed"
                  >
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                    <span className="ml-auto text-xs text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded">
                      soon
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={item.label}
                  to={item.href!}
                  className={`flex items-center gap-2.5 px-2 py-2 rounded-lg mb-0.5 transition-colors text-sm ${
                    active
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* footer — client profile */}
      <div className="px-4 py-4 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            A
          </span>
          <div className="min-w-0">
            <p className="text-xs text-slate-800 font-medium truncate">Alice Martin</p>
            <p className="text-xs text-slate-400 truncate">Fat loss · 3×/week</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function IconDashboard() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth={1.8} />
      <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth={1.8} />
      <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth={1.8} />
      <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth={1.8} />
    </svg>
  );
}

function IconGraph() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="2" strokeWidth={1.8} />
      <circle cx="19" cy="5" r="2" strokeWidth={1.8} />
      <circle cx="19" cy="19" r="2" strokeWidth={1.8} />
      <path strokeLinecap="round" strokeWidth={1.8} d="M7 11.5l10-5M7 12.5l10 5" />
    </svg>
  );
}

function IconProgram() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function IconHistory() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconStats() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function IconBody() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function IconPR() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}

function IconProfile() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
