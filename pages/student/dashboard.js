import StudentLayout from "@/components/layout/StudentLayout";
import {
  BookOpen,
  Calendar,
  Users,
  Video,
  Clock,
  Star,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function StudentDashboard() {
  const [stats, setStats] = useState({});
  const [upcoming, setUpcoming] = useState([]);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    // Mock data
    setStats({
      tutors: 3,
      sessions: 12,
      subjects: ["Mathematics", "Physics", "English"],
    });

    setUpcoming([
      {
        id: 1,
        subject: "Mathematics",
        tutor: "Mr. John Doe",
        time: "10:00 AM",
        date: "2025-07-17",
        avatar: "/assets/img/profile.jpg",
        mode: "Online",
      },
      {
        id: 2,
        subject: "English",
        tutor: "Ms. Zainab Musa",
        time: "3:00 PM",
        date: "2025-07-18",
        avatar: "/assets/img/profile.jpg",
        mode: "Online",
      },
    ]);

    setRecent([
      {
        id: 1,
        type: "session_completed",
        message: "Completed Physics session with Mr. Emeka",
        time: "2 days ago",
        icon: <CheckCircle className="text-success" size={16} />,
      },
      {
        id: 2,
        type: "rating",
        message: "You rated Ms. Ada 5 stars",
        time: "3 days ago",
        icon: <Star className="text-warning" size={16} />,
      },
    ]);
  }, []);

  return (
    <StudentLayout>
      {/* Header */}
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Welcome back 👋</h2>
        <p className="text-muted mb-0">Here’s your learning overview.</p>
      </div>

      {/* Stats Cards */}
      <div className="row g-3 mb-5">
        <div className="col-md-4">
          <div className="bg-primary bg-opacity-10 rounded p-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h5 className="fw-bold mb-0 text-primary">{stats.tutors}</h5>
                <small className="text-muted">Active Tutors</small>
              </div>
              <Users className="text-primary" size={24} />
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="bg-success bg-opacity-10 rounded p-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h5 className="fw-bold mb-0 text-success">{stats.sessions}</h5>
                <small className="text-muted">Sessions Booked</small>
              </div>
              <Calendar className="text-success" size={24} />
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="bg-info bg-opacity-10 rounded p-3 h-100">
            <div className="d-flex align-items-center justify-content-between">
              <div>
                <h5 className="fw-bold mb-0 text-info">
                  {stats.subjects?.length}
                </h5>
                <small className="text-muted">Subjects</small>
              </div>
              <BookOpen className="text-info" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Sessions & Recent Activity */}
      <div className="row g-4 mb-5">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-bottom">
              <h5 className="fw-semibold mb-0">📅 Upcoming Sessions</h5>
            </div>
            <div className="card-body">
              {upcoming.length === 0 ? (
                <p className="text-muted text-center">
                  No sessions scheduled yet.
                </p>
              ) : (
                <div className="vstack gap-3">
                  {upcoming.map((s) => (
                    <div
                      key={s.id}
                      className="d-flex align-items-center justify-content-between border rounded p-3"
                    >
                      <div className="d-flex align-items-center">
                        <img
                          src={s.avatar}
                          alt={s.tutor}
                          className="rounded-circle me-3"
                          width={42}
                          height={42}
                        />
                        <div>
                          <h6 className="fw-semibold mb-1">{s.subject}</h6>
                          <small className="text-muted">
                            {s.time} on {new Date(s.date).toDateString()} with{" "}
                            {s.tutor}
                          </small>
                        </div>
                      </div>
                      <button className="btn btn-sm btn-outline-primary">
                        <Video size={14} className="me-1" />
                        Join
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent border-bottom">
              <h5 className="fw-semibold mb-0">Recent Activity</h5>
            </div>
            <div className="card-body">
              {recent.length === 0 ? (
                <p className="text-muted text-center">No activity yet.</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {recent.map((act) => (
                    <li key={act.id} className="d-flex align-items-start mb-3">
                      <div className="me-2">{act.icon}</div>
                      <div>
                        <p className="small mb-1">{act.message}</p>
                        <small className="text-muted">{act.time}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="card border-0 shadow-sm">
        <div className="card-body text-center p-4">
          <h5 className="fw-bold mb-2">Need help with a new topic?</h5>
          <p className="text-muted mb-3">
            Explore tutors available in your subjects of interest.
          </p>
          <button className="btn btn-primary">
            <ArrowRight size={16} className="me-1" />
            Book a Tutor
          </button>
        </div>
      </div>
    </StudentLayout>
  );
}
