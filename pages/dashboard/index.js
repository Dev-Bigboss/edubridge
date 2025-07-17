import { useState, useEffect } from "react";
import {
  User,
  Calendar,
  DollarSign,
  Star,
  Clock,
  Users,
  Activity,
  ArrowUp,
  CheckCircle,
  BookOpen,
  MessageSquare,
  Target,
  Award,
  Video,
  Eye,
  BarChart3,
  Plus,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import TutorLayout from "@/components/layout/TutorLayout";

const StatCard = ({ icon, label, value, trend, color }) => (
  <div className="col-md-3 col-sm-6">
    <div className="card border-0 shadow-sm h-100 stat-card">
      <div className="card-body text-center">
        <div
          className={`bg-${color} bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3`}
          style={{ width: "60px", height: "60px" }}
        >
          {icon}
        </div>
        <h4 className="fw-bold mb-1">{value}</h4>
        <p className="text-muted mb-2">{label}</p>
        {trend && (
          <div className="d-flex align-items-center justify-content-center">
            <ArrowUp className={`text-${color} me-1`} size={16} />
            <small className={`text-${color}`}>{trend}</small>
          </div>
        )}
      </div>
    </div>
  </div>
);

export default function TutorDashboard() {
  const [stats, setStats] = useState({});
  const [classesToday, setClassesToday] = useState([]);
  const [requests, setRequests] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    setStats({
      students: 24,
      earnings: 125000,
      upcoming: 3,
      rating: 4.8,
      totalHours: 156,
      completedSessions: 89,
      monthlyGrowth: 12.5,
      activeStudents: 18,
      walletBalance: 45000
    });

    setClassesToday([
      {
        id: 1,
        time: "10:00 AM",
        student: "Ada Obi",
        subject: "Mathematics",
        duration: "1 hour",
        link: "#",
      },
    ]);

    setRequests([
      {
        id: 1,
        name: "Blessing Agbo",
        subject: "Biology",
        message: "Help needed for WAEC prep",
        hourlyRate: 3500,
        preferredTime: "Weekends",
        requestedAt: "2024-01-14T08:30:00Z",
      },
    ]);

    setRecentActivity([
      {
        type: "session_completed",
        message: "Completed Mathematics session with Ada Obi",
        time: "2024-01-14T12:00:00Z",
        icon: <CheckCircle className="text-success" size={16} />,
      },
      {
        type: "rating",
        message: "Received 5-star rating from Zainab Musa",
        time: "2024-01-13T14:00:00Z",
        icon: <Star className="text-warning" size={16} />,
      },
    ]);
  }, []);

  const handleAcceptRequest = (id) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <TutorLayout>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1">Welcome back, Tutor 👋</h2>
          <p className="text-muted">Here's what's happening today.</p>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary">
            <Plus size={16} className="me-1" />
            Add Session
          </button>
          <button className="btn btn-primary">
            <BarChart3 size={16} className="me-1" />
            Analytics
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="row g-4 mb-4">
        <StatCard
          icon={<Users className="text-primary" size={24} />}
          label="Active Students"
          value={stats.activeStudents}
          color="primary"
        />
        <StatCard
          icon={<Clock className="text-success" size={24} />}
          label="Total Hours"
          value={stats.totalHours}
          color="success"
        />
        <StatCard
          icon={<Star className="text-warning" size={24} />}
          label="Average Rating"
          value={stats.rating}
          color="warning"
        />
        <StatCard
          icon={<Target className="text-info" size={24} />}
          label="Completed Sessions"
          value={stats.completedSessions}
          color="info"
        />
        <StatCard
          icon={<DollarSign />}
          label="Wallet Balance (₦)"
          value={stats.walletBalance?.toLocaleString()}
        />
      </div>

      {/* Schedule + Activity */}
      <div className="row g-4 mb-4">
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent">
              <h5 className="mb-0 fw-semibold">📆 Today's Schedule</h5>
            </div>
            <div className="card-body">
              {classesToday.length === 0 ? (
                <p className="text-muted">No classes scheduled for today.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {classesToday.map((c) => (
                    <li
                      key={c.id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <div>
                        <h6 className="mb-1 fw-semibold">{c.subject}</h6>
                        <small className="text-muted">
                          {c.time} • {c.duration} • {c.student}
                        </small>
                      </div>
                      <a
                        href={c.link}
                        className="btn btn-sm btn-outline-primary"
                      >
                        Join
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-transparent">
              <h5 className="mb-0 fw-semibold">🕒 Recent Activity</h5>
            </div>
            <div className="card-body">
              {recentActivity.map((item, i) => (
                <div className="d-flex mb-3" key={i}>
                  <div className="me-3">{item.icon}</div>
                  <div>
                    <div className="small">{item.message}</div>
                    <small className="text-muted">
                      {formatDistanceToNow(parseISO(item.time))} ago
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Class Requests */}
      <div className="card border-0 shadow-sm mb-5">
        <div className="card-header bg-transparent">
          <h5 className="mb-0 fw-semibold">📝 Class Requests</h5>
        </div>
        <div className="card-body">
          {requests.length === 0 ? (
            <p className="text-muted">No pending requests.</p>
          ) : (
            <div className="row g-3">
              {requests.map((r) => (
                <div className="col-md-6" key={r.id}>
                  <div className="p-3 border rounded h-100">
                    <h6 className="fw-bold mb-1">{r.name}</h6>
                    <small className="text-muted d-block mb-2">
                      {r.subject}
                    </small>
                    <p className="small text-muted mb-2">{r.message}</p>
                    <div className="d-flex justify-content-between mb-3">
                      <small className="text-muted">
                        Rate: ₦{r.hourlyRate.toLocaleString()}
                      </small>
                      <small className="text-muted">
                        Prefers: {r.preferredTime}
                      </small>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleAcceptRequest(r.id)}
                      >
                        <CheckCircle size={14} className="me-1" />
                        Accept
                      </button>
                      <button className="btn btn-sm btn-outline-danger">
                        <XCircle size={14} className="me-1" />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Extra Styling */}
      <style jsx>{`
        .stat-card:hover {
          transform: translateY(-2px);
          transition: all 0.2s ease;
        }
      `}</style>
    </TutorLayout>
  );
}
