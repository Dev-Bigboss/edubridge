import { useState, useEffect } from "react";
import {
  User,
  Calendar,
  DollarSign,
  Star,
  BookOpen,
  Clock,
  TrendingUp,
  Users,
  MessageSquare,
  CheckCircle,
  XCircle,
  Video,
  Bell,
  Award,
  Target,
  Activity,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Plus,
  Eye,
} from "lucide-react";
import TutorLayout from "@/components/layout/TutorLayout";

export default function TutorDashboard() {
  const [stats, setStats] = useState({
    students: 0,
    earnings: 0,
    upcoming: 0,
    rating: 0,
    totalHours: 0,
    completedSessions: 0,
    monthlyGrowth: 0,
    activeStudents: 0,
  });

  const [classesToday, setClassesToday] = useState([]);
  const [requests, setRequests] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState([]);

  useEffect(() => {
    // Mock API responses
    setStats({
      students: 24,
      earnings: 125000,
      upcoming: 3,
      rating: 4.8,
      totalHours: 156,
      completedSessions: 89,
      monthlyGrowth: 12.5,
      activeStudents: 18,
    });

    setClassesToday([
      {
        id: 1,
        time: "10:00 AM",
        student: "Ada Obi",
        subject: "Mathematics",
        duration: "1 hour",
        type: "Online",
        status: "upcoming",
        avatar: "/assets/img/avatar.png",
        link: "#",
      },
      {
        id: 2,
        time: "2:00 PM",
        student: "John Okafor",
        subject: "Physics",
        duration: "1.5 hours",
        type: "Online",
        status: "upcoming",
        avatar: "/assets/img/avatar.png",
        link: "#",
      },
      {
        id: 3,
        time: "4:30 PM",
        student: "Zainab Musa",
        subject: "English",
        duration: "1 hour",
        type: "In-person",
        status: "upcoming",
        avatar: "/assets/img/avatar.png",
        link: "#",
      },
    ]);

    setRequests([
      {
        id: 1,
        name: "Blessing Agbo",
        subject: "Biology",
        message:
          "Need help with exam prep for WAEC Biology. Struggling with plant biology.",
        hourlyRate: 3500,
        preferredTime: "Weekends",
        avatar: "/assets/img/avatar.png",
        requestedAt: "2024-01-14T08:30:00Z",
      },
      {
        id: 2,
        name: "Emeka Jude",
        subject: "Chemistry",
        message:
          "I struggle with chemical equations and balancing. Need consistent weekly sessions.",
        hourlyRate: 4000,
        preferredTime: "Evenings",
        avatar: "/assets/img/avatar.png",
        requestedAt: "2024-01-13T15:45:00Z",
      },
    ]);

    setRecentActivity([
      {
        type: "session_completed",
        message: "Completed Mathematics session with Ada Obi",
        time: "2 hours ago",
        icon: <CheckCircle className="text-success" size={16} />,
      },
      {
        type: "new_student",
        message: "New student John Doe joined your Physics class",
        time: "5 hours ago",
        icon: <User className="text-primary" size={16} />,
      },
      {
        type: "payment_received",
        message: "Payment received: ₦15,000 for weekly sessions",
        time: "1 day ago",
        icon: <DollarSign className="text-success" size={16} />,
      },
      {
        type: "rating",
        message: "Received 5-star rating from Zainab Musa",
        time: "2 days ago",
        icon: <Star className="text-warning" size={16} />,
      },
    ]);

    setWeeklyStats([
      { day: "Mon", sessions: 4, hours: 6 },
      { day: "Tue", sessions: 3, hours: 4.5 },
      { day: "Wed", sessions: 5, hours: 7 },
      { day: "Thu", sessions: 2, hours: 3 },
      { day: "Fri", sessions: 6, hours: 8 },
      { day: "Sat", sessions: 3, hours: 4 },
      { day: "Sun", sessions: 1, hours: 1.5 },
    ]);
  }, []);

  const handleAcceptRequest = (id) => {
    setRequests((prev) => prev.filter((req) => req.id !== id));
    // Add to recent activity
    setRecentActivity((prev) => [
      {
        type: "request_accepted",
        message: "Accepted new tutoring request",
        time: "Just now",
        icon: <CheckCircle className="text-success" size={16} />,
      },
      ...prev,
    ]);
  };

  const handleDeclineRequest = (id) => {
    setRequests((prev) => prev.filter((req) => req.id !== id));
  };

  const getTimeUntilClass = (time) => {
    const now = new Date();
    const classTime = new Date();
    const [hours, minutes] = time.split(":");
    const period = time.includes("PM") ? "PM" : "AM";

    classTime.setHours(
      period === "PM" && !hours.includes("12")
        ? parseInt(hours) + 12
        : parseInt(hours),
      parseInt(minutes.replace(/[^\d]/g, "")),
      0
    );

    const diff = classTime - now;
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (diff < 0) return "Past";
    if (hoursLeft === 0) return `${minutesLeft}m`;
    return `${hoursLeft}h ${minutesLeft}m`;
  };

  return (
    <TutorLayout>
      {/* Header */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h2 className="fw-bold mb-1">Welcome back, Tutor 👋</h2>
            <p className="text-muted mb-0">
              Here's what's happening with your account today.
            </p>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-primary">
              <Plus size={16} className="me-1" />
              Add Session
            </button>
            <button className="btn btn-primary">
              <BarChart3 size={16} className="me-1" />
              View Analytics
            </button>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-6">
            <div className="bg-primary bg-opacity-10 rounded p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-primary fw-bold h5 mb-0">
                    {stats.upcoming}
                  </div>
                  <small className="text-muted">Classes Today</small>
                </div>
                <Calendar className="text-primary" size={24} />
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="bg-success bg-opacity-10 rounded p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-success fw-bold h5 mb-0">
                    {stats.activeStudents}
                  </div>
                  <small className="text-muted">Active Students</small>
                </div>
                <Users className="text-success" size={24} />
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="bg-warning bg-opacity-10 rounded p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-warning fw-bold h5 mb-0">
                    {stats.totalHours}
                  </div>
                  <small className="text-muted">Total Hours</small>
                </div>
                <Clock className="text-warning" size={24} />
              </div>
            </div>
          </div>
          <div className="col-md-3 col-6">
            <div className="bg-info bg-opacity-10 rounded p-3">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-info fw-bold h5 mb-0">
                    {stats.rating}
                  </div>
                  <small className="text-muted">Rating</small>
                </div>
                <Star className="text-info" size={24} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="row g-4 mb-5">
        <div className="col-md-3 col-sm-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div
                className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: "60px", height: "60px" }}
              >
                <User className="text-primary" size={24} />
              </div>
              <h4 className="fw-bold mb-1">{stats.students}</h4>
              <p className="text-muted mb-2">Total Students</p>
              <div className="d-flex align-items-center justify-content-center">
                <ArrowUp className="text-success me-1" size={16} />
                <small className="text-success">
                  +{stats.monthlyGrowth}% this month
                </small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div
                className="bg-success bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: "60px", height: "60px" }}
              >
                <DollarSign className="text-success" size={24} />
              </div>
              <h4 className="fw-bold mb-1">
                ₦{stats.earnings?.toLocaleString()}
              </h4>
              <p className="text-muted mb-2">Total Earnings</p>
              <div className="d-flex align-items-center justify-content-center">
                <ArrowUp className="text-success me-1" size={16} />
                <small className="text-success">+8.2% from last month</small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div
                className="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: "60px", height: "60px" }}
              >
                <Target className="text-warning" size={24} />
              </div>
              <h4 className="fw-bold mb-1">{stats.completedSessions}</h4>
              <p className="text-muted mb-2">Completed Sessions</p>
              <div className="d-flex align-items-center justify-content-center">
                <Activity className="text-info me-1" size={16} />
                <small className="text-info">95% completion rate</small>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3 col-sm-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body text-center">
              <div
                className="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                style={{ width: "60px", height: "60px" }}
              >
                <Star className="text-info" size={24} />
              </div>
              <h4 className="fw-bold mb-1">{stats.rating}</h4>
              <p className="text-muted mb-2">Average Rating</p>
              <div className="d-flex align-items-center justify-content-center">
                <Award className="text-warning me-1" size={16} />
                <small className="text-warning">Top 10% tutors</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-5">
        {/* Today's Classes */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent border-0 pb-0">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="fw-semibold mb-0">📆 Today's Schedule</h5>
                <span className="badge bg-primary">
                  {classesToday.length} classes
                </span>
              </div>
            </div>
            <div className="card-body">
              {classesToday.length === 0 ? (
                <div className="text-center py-4">
                  <Calendar size={48} className="text-muted mb-3" />
                  <p className="text-muted">No classes scheduled for today.</p>
                  <button className="btn btn-primary">
                    <Plus size={16} className="me-1" />
                    Schedule a Class
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {classesToday.map((c) => (
                    <div key={c.id} className="border rounded p-3 mb-3">
                      <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                          <img
                            src={c.avatar}
                            alt={c.student}
                            className="rounded-circle me-3"
                            width={40}
                            height={40}
                          />
                          <div>
                            <h6 className="mb-1 fw-semibold">{c.subject}</h6>
                            <div className="d-flex align-items-center text-muted small">
                              <Clock size={14} className="me-1" />
                              {c.time} • {c.duration} • {c.student}
                            </div>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <span className="badge bg-light text-dark border">
                            {getTimeUntilClass(c.time)}
                          </span>
                          <div className="btn-group">
                            <button className="btn btn-sm btn-outline-primary">
                              <Video size={14} className="me-1" />
                              Join
                            </button>
                            <button className="btn btn-sm btn-outline-secondary">
                              <Eye size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent border-0 pb-0">
              <h5 className="fw-semibold mb-0">Recent Activity</h5>
            </div>
            <div className="card-body">
              <div className="timeline">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="d-flex mb-3">
                    <div className="flex-shrink-0 me-3">{activity.icon}</div>
                    <div className="flex-grow-1">
                      <p className="small mb-1">{activity.message}</p>
                      <small className="text-muted">{activity.time}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Class Requests */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent border-0 pb-0">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="fw-semibold mb-0">📝 Pending Class Requests</h5>
            <span className="badge bg-warning">{requests.length} pending</span>
          </div>
        </div>
        <div className="card-body">
          {requests.length === 0 ? (
            <div className="text-center py-4">
              <MessageSquare size={48} className="text-muted mb-3" />
              <p className="text-muted">You have no new class requests.</p>
            </div>
          ) : (
            <div className="row g-3">
              {requests.map((req) => (
                <div key={req.id} className="col-lg-6">
                  <div className="border rounded p-4 h-100">
                    <div className="d-flex align-items-center mb-3">
                      <img
                        src={req.avatar}
                        alt={req.name}
                        className="rounded-circle me-3"
                        width={50}
                        height={50}
                      />
                      <div>
                        <h6 className="mb-1 fw-semibold">{req.name}</h6>
                        <div className="d-flex align-items-center text-muted small">
                          <BookOpen size={14} className="me-1" />
                          {req.subject}
                        </div>
                      </div>
                    </div>

                    <p className="small text-muted mb-3">{req.message}</p>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="bg-light rounded p-2">
                          <small className="text-muted d-block">Rate</small>
                          <small className="fw-semibold">
                            ₦{req.hourlyRate.toLocaleString()}/hr
                          </small>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="bg-light rounded p-2">
                          <small className="text-muted d-block">Time</small>
                          <small className="fw-semibold">
                            {req.preferredTime}
                          </small>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-success flex-fill"
                        onClick={() => handleAcceptRequest(req.id)}
                      >
                        <CheckCircle size={14} className="me-1" />
                        Accept
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger flex-fill"
                        onClick={() => handleDeclineRequest(req.id)}
                      >
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
    </TutorLayout>
  );
}
