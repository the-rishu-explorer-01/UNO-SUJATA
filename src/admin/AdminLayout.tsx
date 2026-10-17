import { useEffect, useState } from "react";
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Download, FileText, Factory, Gauge, HelpCircle, Inbox, LayoutGrid, LogOut, Menu, Package, Settings, Users, Sparkles, Wrench } from "lucide-react";
import { AdminAuthProvider, useAdminAuth } from "@/admin/AdminAuth";
import Logo from "@/components/Logo";
import { Button } from "@/admin/ui";

const nav = [
  { to: "/admin", label: "Dashboard", icon: Gauge, end: true },
  { to: "/admin/rfqs", label: "RFQs", icon: FileText },
  { to: "/admin/contacts", label: "Contacts", icon: Inbox },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: LayoutGrid },
  { to: "/admin/industries", label: "Industries", icon: Factory },
  { to: "/admin/capabilities", label: "Capabilities", icon: Wrench },
  { to: "/admin/content", label: "Content", icon: Sparkles },
  { to: "/admin/faq", label: "FAQ", icon: HelpCircle },
  { to: "/admin/resources", label: "Resources", icon: Download },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

/** Entry point for everything under /admin. Public header and footer are not rendered here. */
export default function AdminRoot() {
  return (
    <AdminAuthProvider>
      <AdminGuard />
    </AdminAuthProvider>
  );
}

function AdminGuard() {
  const { state } = useAdminAuth();
  const location = useLocation();

  if (state.status === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-bone font-mono text-xs uppercase tracking-technical text-ink/60">Loading…</div>;
  }
  // Route protection for the UI only. The server refuses every API call without a valid session.
  if (state.status === "anonymous") {
    if (location.pathname === "/admin/login") return <Outlet />;
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/admin/login?next=${next}`} replace />;
  }
  if (location.pathname === "/admin/login") return <Navigate to="/admin" replace />;
  return <Shell user={state.user} />;
}

function Shell({ user }: { user: { name: string; email: string; role: string } }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAdminAuth();

  // Close the mobile navigation when the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  const sidebar = (
    <nav aria-label="Admin navigation" className="flex h-full flex-col">
      <Link to="/admin" className="flex items-center gap-3 border-b border-graphite px-5 py-5">
        <Logo inverted size="sm" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-brass-light">Admin</span>
      </Link>
      <ul className="flex-1 space-y-1 p-3">
        {nav.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-10 items-center gap-3 px-3 py-2 font-body text-sm transition-colors ${
                  isActive ? "bg-graphite text-bone" : "text-bone/70 hover:bg-graphite/60 hover:text-bone"
                }`
              }
            >
              <item.icon size={17} aria-hidden="true" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="border-t border-graphite p-4 font-body text-xs text-bone/60">
        <p className="truncate text-bone">{user.name}</p>
        <p className="truncate">{user.email}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-brass-light">{user.role}</p>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-bone text-ink">
      {/* Desktop and large tablet: fixed sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 bg-steel text-bone md:block">{sidebar}</aside>

      {/* Small tablet and phone: slide-in navigation */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-steel text-bone shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-line bg-paper px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Open navigation" onClick={() => setOpen(true)} className="inline-flex h-10 w-10 items-center justify-center md:hidden">
              <Menu size={20} />
            </button>
            <p className="font-mono text-[11px] uppercase tracking-technical text-ink/65">Internal · Staff only</p>
          </div>
          <Button variant="ghost" onClick={handleLogout} aria-label="Sign out">
            <LogOut size={16} aria-hidden="true" /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>

        <main id="admin-main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1200px] space-y-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

