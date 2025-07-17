// pages/admin/students.js
import AdminLayout from "@/components/layout/AdminLayout";
import {
  Users,
  Eye,
  MessageSquare,
  Trash2,
  Search,
  BookOpen,
  Calendar,
  Mail,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";

const mockStudents = [
  {
    id: 1,
    name: "Ada Obi",
    email: "ada@example.com",
    joined: "2024-10-01",
    subjects: ["Math", "English"],
    sessions: 15,
    lastSeen: "2024-01-10",
    status: "active",
  },
  {
    id: 2,
    name: "John Doe",
    email: "john@example.com",
    joined: "2024-11-15",
    subjects: ["Biology", "Chemistry"],
    sessions: 10,
    lastSeen: "2024-01-08",
    status: "inactive",
  },
];

const statusColors = {
  active: "success",
  inactive: "secondary",
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setStudents(mockStudents);
  }, []);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleRemove = () => {
    setStudents((prev) => prev.filter((s) => s.id !== selected.id));
    setModal("");
    setSelected(null);
  };

  return (
    <AdminLayout>
      <div className="mb-4">
        <h3 className="fw-bold mb-2">Students Management</h3>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="position-relative w-50">
            <Search
              className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
              size={16}
            />
            <input
              type="text"
              className="form-control ps-5"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-hover">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Subjects</th>
                <th>Sessions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.email}</td>
                  <td>{s.subjects.join(", ")}</td>
                  <td>{s.sessions}</td>
                  <td>
                    <span className={`badge bg-${statusColors[s.status]}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <div className="btn-group">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => {
                          setSelected(s);
                          setModal("view");
                        }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => {
                          setSelected(s);
                          setModal("message");
                        }}
                      >
                        <MessageSquare size={14} />
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {modal && selected && (
          <div
            className="modal fade show d-block"
            style={{ background: "rgba(0,0,0,0.5)" }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-0">
                  <h5 className="modal-title fw-bold">
                    {modal === "view" && "Student Details"}
                    {modal === "message" && "Send Message"}
                    {modal === "remove" && "Remove Student"}
                  </h5>
                  <button
                    className="btn-close"
                    onClick={() => {
                      setModal("");
                      setSelected(null);
                    }}
                  />
                </div>
                <div className="modal-body">
                  {modal === "view" && (
                    <>
                      <div className="mb-3">
                        <strong>Email:</strong> {selected.email}
                      </div>
                      <div className="mb-3">
                        <strong>Subjects:</strong>{" "}
                        {selected.subjects.join(", ")}
                      </div>
                      <div className="mb-3">
                        <strong>Sessions:</strong> {selected.sessions}
                      </div>
                      <div className="mb-3">
                        <strong>Joined:</strong>{" "}
                        {new Date(selected.joined).toLocaleDateString()}
                      </div>
                      <div className="mb-3">
                        <strong>Last Seen:</strong>{" "}
                        {new Date(selected.lastSeen).toLocaleDateString()}
                      </div>
                    </>
                  )}

                  {modal === "message" && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        alert(`Message to ${selected.name}: ${message}`);
                        setMessage("");
                        setModal("");
                      }}
                    >
                      <div className="mb-3">
                        <label className="form-label">Message</label>
                        <textarea
                          className="form-control"
                          required
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                        />
                      </div>
                      <button type="submit" className="btn btn-primary">
                        Send
                      </button>
                    </form>
                  )}

                  {modal === "remove" && (
                    <div className="text-center">
                      <Trash2 className="text-danger mb-3" size={48} />
                      <p className="mb-3">
                        Are you sure you want to remove {selected.name}?
                      </p>
                      <div className="d-flex justify-content-center gap-2">
                        <button
                          className="btn btn-secondary"
                          onClick={() => setModal("")}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={handleRemove}
                        >
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
      </div>
    </AdminLayout>
  );
}
