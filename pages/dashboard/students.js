import TutorLayout from "@/components/layout/TutorLayout";
import {
  User,
  MessageSquare,
  Trash2,
  Eye,
  Calendar,
  Send,
  Mail,
  BookOpen,
  Search,
  Users,
  Clock,
  MoreVertical,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

function StudentActionsDropdown({ onView, onMessage, onRemove }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();

  const handleClickOutside = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="position-relative" ref={dropdownRef}>
      <button
        className="btn btn-sm btn-outline-secondary"
        onClick={() => setOpen(!open)}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          className="dropdown-menu show position-absolute"
          style={{ zIndex: 1000 }}
        >
          <button
            className="dropdown-item"
            onClick={() => {
              onView();
              setOpen(false);
            }}
          >
            <Eye size={16} className="me-2" /> View Details
          </button>
          <button
            className="dropdown-item"
            onClick={() => {
              onMessage();
              setOpen(false);
            }}
          >
            <MessageSquare size={16} className="me-2" /> Send Message
          </button>
          <div className="dropdown-divider" />
          <button
            className="dropdown-item text-danger"
            onClick={() => {
              onRemove();
              setOpen(false);
            }}
          >
            <Trash2 size={16} className="me-2" /> Remove Student
          </button>
        </div>
      )}
    </div>
  );
}

const mockStudents = [
  {
    id: 1,
    name: "Ada Obi",
    email: "ada@example.com",
    subjects: ["Mathematics", "Physics"],
    joined: "2024-10-01",
    status: "active",
    sessions: 15,
    avatar: "/assets/img/profile.jpg",
    lastSeen: "2024-01-10",
    grade: "A",
  },
  {
    id: 2,
    name: "John Doe",
    email: "john@example.com",
    subjects: ["English", "Literature"],
    joined: "2024-11-15",
    status: "active",
    sessions: 8,
    avatar: "/assets/img/profile.jpg",
    lastSeen: "2024-01-12",
    grade: "B+",
  },
  {
    id: 3,
    name: "Zainab Musa",
    email: "zainab@example.com",
    subjects: ["Biology", "Chemistry"],
    joined: "2024-12-03",
    status: "inactive",
    sessions: 22,
    avatar: "/assets/img/profile.jpg",
    lastSeen: "2024-01-05",
    grade: "A-",
  },
];

const statusColors = {
  active: "success",
  inactive: "secondary",
  pending: "warning",
};

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setStudents(mockStudents);
  }, []);

  const filtered = [...students]
    .filter((s) =>
      (s.name + s.email + s.subjects.join(", "))
        .toLowerCase()
        .includes(search.toLowerCase())
    )
    .filter((s) => filterStatus === "all" || s.status === filterStatus)
    .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));

  const handleRemove = () => {
    setStudents((prev) => prev.filter((s) => s.id !== selected.id));
    setModal("");
    setSelected(null);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    alert(`Message sent to ${selected.name}: "${message}"`);
    setMessage("");
    setModal("");
  };

  const closeModal = () => {
    setModal("");
    setSelected(null);
    setMessage("");
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const getStatusBadge = (status) => (
    <span
      className={`badge bg-${statusColors[status]} bg-opacity-10 text-${statusColors[status]} border border-${statusColors[status]} border-opacity-25`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  return (
    <TutorLayout>
      <div className="mb-4">
        <h3 className="fw-bold mb-1">Students</h3>
        <p className="text-muted mb-4">
          Manage your students and track their progress
        </p>

        <div className="row g-3 mb-4">
          <div className="col-md-8">
            <div className="position-relative">
              <Search
                className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                size={16}
              />
              <input
                type="text"
                className="form-control ps-5"
                placeholder="Search by name, email, or subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-4">
            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table View */}
      <div className="card border-0 shadow-sm d-none d-md-block">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Student</th>
                <th>Subjects</th>
                <th>Status</th>
                <th>Sessions</th>
                <th>Last Seen</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="py-3">
                    <div className="d-flex align-items-center">
                      <img
                        src={s.avatar}
                        className="rounded-circle me-2"
                        width={36}
                        height={36}
                        alt={s.name}
                      />
                      <div>
                        <div className="fw-semibold">{s.name}</div>
                        <small className="text-muted">{s.email}</small>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    {s.subjects.map((sub, i) => (
                      <span
                        key={i}
                        className="badge bg-light text-dark border me-1"
                      >
                        {sub}
                      </span>
                    ))}
                  </td>
                  <td className="py-3">{getStatusBadge(s.status)}</td>
                  <td className="py-3">{s.sessions}</td>
                  <td className="py-3">
                    <small>{new Date(s.lastSeen).toLocaleDateString()}</small>
                  </td>
                  <td className="py-3">
                    <StudentActionsDropdown
                      onView={() => {
                        setSelected(s);
                        setModal("view");
                      }}
                      onMessage={() => {
                        setSelected(s);
                        setModal("message");
                      }}
                      onRemove={() => {
                        setSelected(s);
                        setModal("remove");
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="d-md-none">
        {filtered.map((s) => (
          <div key={s.id} className="card mb-3">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h6 className="mb-0 fw-semibold">{s.name}</h6>
                  <small className="text-muted">{s.email}</small>
                </div>
                {getStatusBadge(s.status)}
              </div>
              <div className="d-flex justify-content-between text-muted small">
                <div>
                  <BookOpen size={14} className="me-1" />
                  {s.subjects.length} subjects
                </div>
                <div>
                  <Clock size={14} className="me-1" />
                  {s.sessions} sessions
                </div>
              </div>
              <div className="d-flex gap-2 mt-3">
                <button
                  className="btn btn-sm btn-outline-primary w-100"
                  onClick={() => {
                    setSelected(s);
                    setModal("view");
                  }}
                >
                  <Eye size={14} className="me-1" /> View
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary w-100"
                  onClick={() => {
                    setSelected(s);
                    setModal("message");
                  }}
                >
                  <MessageSquare size={14} className="me-1" /> Message
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => {
                    setSelected(s);
                    setModal("remove");
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="text-center py-5">
          <Users size={48} className="text-muted mb-3" />
          <h5 className="text-muted">No students found</h5>
          <p className="text-muted">Try different filters or keywords.</p>
        </div>
      )}

      {/* Modal */}
      {modal && selected && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target.classList.contains("modal")) closeModal();
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {modal === "view" && "Student Details"}
                  {modal === "message" && "Send Message"}
                  {modal === "remove" && "Remove Student"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeModal}
                />
              </div>
              <div className="modal-body">
                {modal === "view" && (
                  <>
                    <div className="text-center mb-3">
                      <img
                        src={selected.avatar}
                        alt={selected.name}
                        className="rounded-circle mb-2"
                        width={60}
                        height={60}
                      />
                      <h6 className="mb-0">{selected.name}</h6>
                      {getStatusBadge(selected.status)}
                    </div>
                    <p className="mb-2">
                      <strong>Email:</strong> {selected.email}
                    </p>
                    <p className="mb-2">
                      <strong>Subjects:</strong> {selected.subjects.join(", ")}
                    </p>
                    <p className="mb-2">
                      <strong>Joined:</strong>{" "}
                      {new Date(selected.joined).toLocaleDateString()}
                    </p>
                    <p className="mb-0">
                      <strong>Sessions:</strong> {selected.sessions}
                    </p>
                  </>
                )}
                {modal === "message" && (
                  <form onSubmit={handleSendMessage}>
                    <div className="mb-3">
                      <label className="form-label">Message</label>
                      <textarea
                        className="form-control"
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                      />
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={closeModal}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        <Send size={14} className="me-1" /> Send
                      </button>
                    </div>
                  </form>
                )}
                {modal === "remove" && (
                  <div className="text-center">
                    <Trash2 size={40} className="text-danger mb-3" />
                    <p>
                      Are you sure you want to remove{" "}
                      <strong>{selected.name}</strong>?
                    </p>
                    <div className="d-flex justify-content-center gap-2">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={closeModal}
                      >
                        Cancel
                      </button>
                      <button className="btn btn-danger" onClick={handleRemove}>
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </TutorLayout>
  );
}
