// components/layout/AdminLayout.js

import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  DollarSign,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: <LayoutDashboard size={18} /> },
  { label: "Tutors", href: "/admin/tutors", icon: <Users size={18} /> },
  { label: "Students", href: "/admin/students", icon: <BookOpen size={18} /> },
  {
    label: "Payments",
    href: "/admin/payments",
    icon: <DollarSign size={18} />,
  },
  {
    label: "Wallet",
    href: "/admin/wallet",
    icon: <DollarSign size={18} />,
  },
  {
    label: "Messages",
    href: "/admin/messages",
    icon: <MessageSquare size={18} />,
  },
  { label: "Settings", href: "/admin/settings", icon: <Settings size={18} /> },
];

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="d-flex min-vh-100 position-relative">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-lg-none"
          style={{ zIndex: 1040 }}
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`bg-white border-end shadow-sm p-3 position-fixed position-lg-static h-100 d-lg-block ${
          sidebarOpen ? "d-block" : "d-none"
        }`}
        style={{ width: "240px", zIndex: 1050, top: 0, left: 0 }}
      >
        {/* Mobile close button */}
        <div className="d-flex justify-content-between align-items-center mb-4 d-lg-none">
          <div>
            <h4 className="fw-bold mb-0">EduBridge</h4>
            <small className="text-muted">Admin Panel</small>
          </div>
          <button className="btn btn-link p-0 text-dark" onClick={closeSidebar}>
            <X size={24} />
          </button>
        </div>

        {/* Desktop branding */}
        <div className="mb-4 text-center d-none d-lg-block">
          <h4 className="fw-bold mb-0">EduBridge</h4>
          <small className="text-muted">Admin Panel</small>
        </div>

        <nav className="nav flex-column gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link d-flex align-items-center gap-2 px-3 py-2 rounded text-decoration-none ${
                router.pathname === item.href
                  ? "bg-primary text-white"
                  : "text-dark"
              }`}
              style={{ fontWeight: 500 }}
              onClick={closeSidebar}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}

          <hr className="my-3" />

          <Link
            href="/login"
            className="nav-link d-flex align-items-center gap-2 px-3 py-2 rounded text-danger text-decoration-none"
            style={{ fontWeight: 500 }}
            onClick={closeSidebar}
          >
            <LogOut size={18} />
            Logout
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-grow-1">
        {/* Topbar */}
        <div className="d-flex justify-content-between align-items-center px-3 px-lg-4 py-3 border-bottom bg-light">
          <div className="d-flex align-items-center gap-3">
            <button
              className="border-0 p-0 text-dark d-lg-none"
              onClick={toggleSidebar}
              aria-label="Open sidebar"
            >
              <Menu size={24} />
            </button>

            <h5 className="mb-0 fw-semibold text-secondary">
              {navItems.find((n) => n.href === router.pathname)?.label ||
                "Dashboard"}
            </h5>
          </div>

          <div className="d-flex align-items-center gap-2 gap-lg-3">
            <img
              src="/assets/img/avatar.png"
              alt="Admin"
              className="rounded-circle"
              width={32}
              height={32}
              style={{ objectFit: "cover" }}
            />
            <span className="fw-medium d-none d-sm-inline">Admin</span>
          </div>
        </div>

        <div className="p-3 p-sm-4">{children}</div>
      </main>

      {/* Styles */}
      <style jsx>{`
        @media (min-width: 992px) {
          main {
            margin-left: 240px !important;
          }
        }

        @media (max-width: 991.98px) {
          aside {
            transform: translateX(${sidebarOpen ? "0" : "-100%"});
            transition: transform 0.3s ease-in-out;
          }
        }

        .nav-link:hover {
          background-color: #f8f9fa !important;
        }

        .nav-link.bg-primary:hover {
          background-color: #0d6efd !important;
        }
      `}</style>
    </div>
  );
}
