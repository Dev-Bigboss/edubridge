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
  Filter,
  UserPlus,
  MoreVertical,
  Clock,
  Award,
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
          <button className="dropdown-item" onClick={onView}>
            <Eye size={16} className="me-2" />
            View Details
          </button>
          <button className="dropdown-item" onClick={onMessage}>
            <MessageSquare size={16} className="me-2" />
            Send Message
          </button>
          <div className="dropdown-divider" />
          <button className="dropdown-item text-danger" onClick={onRemove}>
            <Trash2 size={16} className="me-2" />
            Remove Student
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
    avatar: "/assets/img/avatar.png",
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
    avatar: "/assets/img/avatar.png",
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
    avatar: "/assets/img/avatar.png",
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

  const filtered = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                         s.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "all" || s.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleRemove = () => {
    setStudents((prev) => prev.filter((s) => s.id !== selected.id));
    setModal("");
    setSelected(null);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    // Here you would typically send the message to your backend
    alert(`Message sent to ${selected.name}: "${message}"`);
    setMessage("");
    setModal("");
  };

  const getStatusBadge = (status) => (
    <span className={`badge bg-${statusColors[status]} bg-opacity-10 text-${statusColors[status]} border border-${statusColors[status]} border-opacity-25`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  return (
    <TutorLayout>
      {/* Header Section */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h3 className="fw-bold mb-1">Students</h3>
            <p className="text-muted mb-0">
              Manage your students and track their progress
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border-0 bg-primary bg-opacity-10">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <Users className="text-primary me-2" size={20} />
                  <div>
                    <div className="fw-bold text-primary">
                      {students.length}
                    </div>
                    <small className="text-muted">Total Students</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 bg-success bg-opacity-10">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <User className="text-success me-2" size={20} />
                  <div>
                    <div className="fw-bold text-success">
                      {students.filter((s) => s.status === "active").length}
                    </div>
                    <small className="text-muted">Active</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 bg-warning bg-opacity-10">
              <div className="card-body p-3">
                <div className="d-flex align-items-center">
                  <Clock className="text-warning me-2" size={20} />
                  <div>
                    <div className="fw-bold text-warning">
                      {students.reduce((sum, s) => sum + s.sessions, 0)}
                    </div>
                    <small className="text-muted">Total Sessions</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
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
                placeholder="Search students by name or email..."
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

      {/* Table for Desktop */}
      <div className="card border-0 shadow-sm d-none d-md-block">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="border-0 fw-semibold">Student</th>
                <th className="border-0 fw-semibold">Subjects</th>
                <th className="border-0 fw-semibold">Status</th>
                <th className="border-0 fw-semibold">Sessions</th>
                <th className="border-0 fw-semibold">Last Seen</th>
                <th className="border-0 fw-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="py-3">
                    <div className="d-flex align-items-center">
                      <div>
                        <div className="fw-semibold">{s.name}</div>
                        <small className="text-muted">{s.email}</small>
                      </div>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="d-flex flex-wrap gap-1">
                      {s.subjects.map((subject, idx) => (
                        <span
                          key={idx}
                          className="badge bg-light text-dark border"
                        >
                          {subject}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3">{getStatusBadge(s.status)}</td>
                  <td className="py-3">
                    <span className="fw-semibold">{s.sessions}</span>
                  </td>

                  <td className="py-3">
                    <small className="text-muted">
                      {new Date(s.lastSeen).toLocaleDateString()}
                    </small>
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
          <div key={s.id} className="card border-0 shadow-sm mb-3">
            <div className="card-body">
              <div className="d-flex align-items-start justify-content-between mb-3">
                <div className="d-flex align-items-center">
                  <div>
                    <h6 className="mb-1 fw-semibold">{s.name}</h6>
                    <small className="text-muted">{s.email}</small>
                  </div>
                </div>
                {getStatusBadge(s.status)}
              </div>

              <div className="row g-3 mb-3">
                <div className="col-6">
                  <div className="d-flex align-items-center">
                    <BookOpen size={16} className="text-primary me-2" />
                    <div>
                      <small className="text-muted d-block">Subjects</small>
                      <small className="fw-semibold">{s.subjects.length}</small>
                    </div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="d-flex align-items-center">
                    <Clock size={16} className="text-success me-2" />
                    <div>
                      <small className="text-muted d-block">Sessions</small>
                      <small className="fw-semibold">{s.sessions}</small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2">
                <button
                  className="btn btn-sm btn-outline-primary flex-fill"
                  onClick={() => {
                    setSelected(s);
                    setModal("view");
                  }}
                >
                  <Eye size={14} className="me-1" />
                  View
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary flex-fill"
                  onClick={() => {
                    setSelected(s);
                    setModal("message");
                  }}
                >
                  <MessageSquare size={14} className="me-1" />
                  Message
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
          <p className="text-muted">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Modals */}
      {modal && selected && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  {modal === "view" && "Student Details"}
                  {modal === "message" && "Send Message"}
                  {modal === "remove" && "Remove Student"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setModal("");
                    setSelected(null);
                    setMessage("");
                  }}
                />
              </div>

              <div className="modal-body">
                {modal === "view" && (
                  <div>
                    <div className="text-center mb-4">
                      <h5 className="mb-1">{selected.name}</h5>
                      {getStatusBadge(selected.status)}
                    </div>

                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="d-flex align-items-center p-3 bg-light rounded">
                          <Mail className="text-primary me-3" size={20} />
                          <div>
                            <small className="text-muted d-block">Email</small>
                            <div className="fw-semibold">{selected.email}</div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex align-items-center p-3 bg-light rounded">
                          <Calendar className="text-success me-3" size={20} />
                          <div>
                            <small className="text-muted d-block">Joined</small>
                            <div className="fw-semibold">
                              {new Date(selected.joined).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="d-flex align-items-center p-3 bg-light rounded">
                          <BookOpen className="text-warning me-3" size={20} />
                          <div>
                            <small className="text-muted d-block">
                              Subjects
                            </small>
                            <div className="fw-semibold">
                              {selected.subjects.join(", ")}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {modal === "message" && (
                  <form onSubmit={handleSendMessage}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Message to {selected.name}
                      </label>
                      <textarea
                        className="form-control"
                        required
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={`Write your message to ${selected.name}...`}
                      />
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setModal("");
                          setMessage("");
                        }}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        <Send size={16} className="me-2" />
                        Send Message
                      </button>
                    </div>
                  </form>
                )}

                {modal === "remove" && (
                  <div className="text-center">
                    <div className="mb-3">
                      <Trash2 size={48} className="text-danger" />
                    </div>
                    <h6 className="mb-3">Remove {selected.name}?</h6>
                    <p className="text-muted mb-4">
                      This action cannot be undone. The student will be
                      permanently removed from your list.
                    </p>
                    <div className="d-flex justify-content-center gap-2">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setModal("");
                          setSelected(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button className="btn btn-danger" onClick={handleRemove}>
                        Remove Student
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