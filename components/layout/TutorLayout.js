import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import {
  BarChart,
  Users,
  Calendar,
  DollarSign,
  MessageCircle,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { icon: <BarChart size={18} />, label: "Dashboard", href: "/dashboard" },
  { icon: <Users size={18} />, label: "Students", href: "/dashboard/students" },
  {
    icon: <Calendar size={18} />,
    label: "Sessions",
    href: "/dashboard/sessions",
  },
  {
    icon: <DollarSign size={18} />,
    label: "Earnings",
    href: "/dashboard/earnings",
  },
  {
    icon: <DollarSign size={18} />,
    label: "Wallet",
    href: "/dashboard/wallet",
  },
  {
    icon: <MessageCircle size={18} />,
    label: "Messages",
    href: "/dashboard/messages",
  },
  {
    icon: <Settings size={18} />,
    label: "Profile",
    href: "/dashboard/profile",
  },
];

export default function TutorLayout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="d-flex min-vh-100 position-relative">
      {/* Mobile Overlay */}
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
        style={{
          width: "240px",
          zIndex: 1050,
          top: 0,
          left: 0,
        }}
      >
        {/* Mobile Close Button */}
        <div className="d-flex justify-content-between align-items-center mb-4 d-lg-none">
          <div>
            <h4 className="fw-bold mb-0">EduBridge</h4>
            <small className="text-muted">Tutor Panel</small>
          </div>
          <button
            className="btn btn-link p-0 text-dark"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Desktop Header */}
        <div className="mb-4 text-center d-none d-lg-block">
          <h4 className="fw-bold mb-0">EduBridge</h4>
          <small className="text-muted">Tutor Panel</small>
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
              style={{ fontWeight: "500" }}
              onClick={closeSidebar}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}

          <hr className="my-3" />

          <Link
            href="/logout"
            className="nav-link d-flex align-items-center gap-2 px-3 py-2 rounded text-danger text-decoration-none"
            style={{ fontWeight: "500" }}
            onClick={closeSidebar}
          >
            <LogOut size={18} />
            Logout
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow-1" style={{ marginLeft: 0 }}>
        {/* Topbar */}
        <div className="d-flex justify-content-between align-items-center px-3 px-lg-4 py-3 border-bottom bg-light">
          <div className="d-flex align-items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              className="border-0 p-0 text-dark d-lg-none"
              onClick={toggleSidebar}
              aria-label="Open sidebar"
            >
              <Menu size={24} />
            </button>

            <h5 className="mb-0 fw-semibold text-secondary d-none d-sm-block">
              {navItems.find((n) => n.href === router.pathname)?.label ||
                "Dashboard"}
            </h5>

            {/* Mobile: Show abbreviated title */}
            <h6 className="mb-0 fw-semibold text-secondary d-sm-none">
              {(
                navItems.find((n) => n.href === router.pathname)?.label ||
                "Dashboard"
              ).substring(0, 10)}
            </h6>
          </div>

          <div className="d-flex align-items-center gap-2 gap-lg-3">
            <img
              src="/assets/img/profile.jpg"
              alt="Avatar"
              className="rounded-circle"
              width={32}
              height={32}
              style={{ objectFit: "cover" }}
            />
            <span className="fw-medium d-none d-sm-inline">Tutor Name</span>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-2 p-sm-3 p-lg-4">{children}</div>
      </main>

      {/* Additional responsive styles */}
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
