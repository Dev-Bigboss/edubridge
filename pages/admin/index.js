// pages/admin/index.js

import AdminLayout from "@/components/layout/AdminLayout";
import { useEffect, useRef, useState } from "react";
import {
  Users,
  User,
  Calendar,
  DollarSign,
  Plus,
  Megaphone,
  Activity,
} from "lucide-react";
import Chart from "chart.js/auto";

export default function AdminDashboard() {
  const chartRef = useRef(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcement, setAnnouncement] = useState({ title: "", message: "" });

  const handleSendAnnouncement = (e) => {
    e.preventDefault();
    alert(
      `Announcement sent!\n\nTitle: ${announcement.title}\nMessage: ${announcement.message}`
    );
    setAnnouncement({ title: "", message: "" });
    setShowAnnouncementModal(false);
  };

  const stats = {
    totalStudents: 512,
    totalTutors: 128,
    totalSessions: 940,
    earnings: 825000,
  };

  const recentActivity = [
    { message: "New student registered: Ada Obi", time: "2 hours ago" },
    {
      message: "Payment of ₦25,000 received from John Doe",
      time: "5 hours ago",
    },
    { message: "New tutor application: Emeka Jude", time: "1 day ago" },
    { message: "Class completed: Biology - Blessing Agbo", time: "2 days ago" },
  ];

  const earningsData = [200, 300, 350, 400, 380, 420, 500];

  useEffect(() => {
    const ctx = chartRef.current.getContext("2d");
    if (chartRef.current.chart) {
      chartRef.current.chart.destroy();
    }

    chartRef.current.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: "Earnings (₦000s)",
            data: earningsData,
            borderColor: "#0d6efd",
            backgroundColor: "rgba(13,110,253,0.1)",
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (val) => `₦${val}k`,
            },
          },
        },
      },
    });
  }, []);

  return (
    <AdminLayout>
      <div className="mb-4">
        <h2 className="fw-bold">Welcome Admin 👋</h2>
        <p className="text-muted">
          Here’s a quick overview of the EduBridge platform.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="row g-4 mb-4">
        <SummaryCard
          icon={<Users />}
          label="Students"
          value={stats.totalStudents}
        />
        <SummaryCard icon={<User />} label="Tutors" value={stats.totalTutors} />
        <SummaryCard
          icon={<Calendar />}
          label="Sessions"
          value={stats.totalSessions}
        />
        <SummaryCard
          icon={<DollarSign />}
          label="Earnings"
          value={`₦${stats.earnings.toLocaleString()}`}
        />
      </div>

      <div className="row g-4">
        {/* Chart */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent border-bottom fw-semibold">
              Weekly Earnings Overview
            </div>
            <div className="card-body">
              <canvas ref={chartRef} height="120" id="adminEarningsChart" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent border-bottom fw-semibold">
              Recent Activity
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0">
                {recentActivity.map((item, i) => (
                  <li key={i} className="mb-3 d-flex">
                    <Activity className="text-primary me-2" size={18} />
                    <div>
                      <div className="fw-medium">{item.message}</div>
                      <small className="text-muted">{item.time}</small>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card border-0 shadow-sm mt-4">
        <div className="card-header bg-transparent border-bottom fw-semibold">
          Quick Actions
        </div>
        <div className="card-body d-flex flex-wrap gap-3">
          {/* <button className="btn btn-outline-primary">
            <Plus className="me-1" size={16} />
            Add New Tutor
          </button> */}
          <button
            className="btn btn-outline-success"
            onClick={() => setShowAnnouncementModal(true)}
          >
            <Megaphone className="me-1" size={16} />
            Send Announcement
          </button>

          <button className="btn btn-outline-secondary">
            <Calendar className="me-1" size={16} />
            Schedule Session
          </button>
        </div>
      </div>
      {showAnnouncementModal && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Send Announcement</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAnnouncementModal(false)}
                />
              </div>
              <form onSubmit={handleSendAnnouncement}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Title</label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={announcement.title}
                      onChange={(e) =>
                        setAnnouncement({
                          ...announcement,
                          title: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Message</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      required
                      value={announcement.message}
                      onChange={(e) =>
                        setAnnouncement({
                          ...announcement,
                          message: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowAnnouncementModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success">
                    Send
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="col-md-3 col-sm-6">
      <div className="card border-0 shadow-sm h-100">
        <div className="card-body d-flex align-items-center gap-3">
          <div className="bg-light rounded-circle p-3 text-primary">{icon}</div>
          <div>
            <h5 className="mb-0 fw-bold">{value}</h5>
            <small className="text-muted">{label}</small>
          </div>
        </div>
      </div>
    </div>
  );
}
