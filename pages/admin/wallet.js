import AdminLayout from "@/components/layout/AdminLayout";
import {
  Banknote,
  UserCheck,
  CheckCircle,
  AlertCircle,
  ArrowRightLeft,
  UserX,
} from "lucide-react";
import { useState } from "react";

export default function AdminWalletPage() {
  const [withdrawals, setWithdrawals] = useState([
    {
      id: 1,
      tutor: "Mr. Emeka Jude",
      amount: 15000,
      date: "2025-07-17",
      status: "pending",
    },
    {
      id: 2,
      tutor: "Ms. Ada Obi",
      amount: 10000,
      date: "2025-07-16",
      status: "pending",
    },
  ]);

  const [refunds, setRefunds] = useState([
    {
      id: 1,
      student: "John Doe",
      amount: 5000,
      reason: "Cancelled session (Maths)",
      date: "2025-07-17",
    },
    {
      id: 2,
      student: "Blessing Agbo",
      amount: 3000,
      reason: "Tutor unavailable (English)",
      date: "2025-07-16",
    },
  ]);

  const walletSummary = {
    totalWalletBalance: 180000,
    totalFunded: 250000,
    totalWithdrawn: 55000,
    totalRefunded: 15000,
  };

  const handleApproveWithdrawal = (id) => {
    setWithdrawals((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: "approved" } : w))
    );
    alert("Withdrawal approved (mock)");
  };

  const handleProcessRefund = (id) => {
    setRefunds((prev) => prev.filter((r) => r.id !== id));
    alert("Refund processed (mock)");
  };

  return (
    <AdminLayout>
      <div className="mb-4">
        <h2 className="fw-bold">Wallet Management</h2>
        <p className="text-muted">
          Overview of wallet balances, student top-ups, tutor withdrawals, and
          refunds.
        </p>
      </div>

      {/* Wallet Summary Cards */}
      <div className="row g-3 mb-4">
        <WalletStatCard
          label="Total Wallet Balance"
          value={walletSummary.totalWalletBalance}
          icon={<Banknote size={20} />}
          color="primary"
        />
        <WalletStatCard
          label="Total Funded by Students"
          value={walletSummary.totalFunded}
          icon={<UserCheck size={20} />}
          color="success"
        />
        <WalletStatCard
          label="Total Withdrawn by Tutors"
          value={walletSummary.totalWithdrawn}
          icon={<CheckCircle size={20} />}
          color="danger"
        />
        <WalletStatCard
          label="Total Refunded to Students"
          value={walletSummary.totalRefunded}
          icon={<AlertCircle size={20} />}
          color="warning"
        />
      </div>

      {/* Tutor Withdrawals */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header fw-semibold bg-transparent border-bottom">
          Tutor Withdrawal Requests
        </div>
        <div className="card-body">
          {withdrawals.length === 0 ? (
            <p className="text-muted">No pending withdrawals.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tutor</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w, i) => (
                    <tr key={w.id}>
                      <td>{i + 1}</td>
                      <td>{w.tutor}</td>
                      <td>₦{w.amount.toLocaleString()}</td>
                      <td>{w.date}</td>
                      <td>
                        <span
                          className={`badge bg-${
                            w.status === "pending" ? "warning" : "success"
                          }`}
                        >
                          {w.status}
                        </span>
                      </td>
                      <td>
                        {w.status === "pending" && (
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => handleApproveWithdrawal(w.id)}
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Student Refunds */}
      <div className="card border-0 shadow-sm">
        <div className="card-header fw-semibold bg-transparent border-bottom">
          Student Refund Requests
        </div>
        <div className="card-body">
          {refunds.length === 0 ? (
            <p className="text-muted">No refund requests at the moment.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Date</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((r, i) => (
                    <tr key={r.id}>
                      <td>{i + 1}</td>
                      <td>{r.student}</td>
                      <td>₦{r.amount.toLocaleString()}</td>
                      <td>{r.reason}</td>
                      <td>{r.date}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleProcessRefund(r.id)}
                        >
                          Process Refund
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// Reusable Wallet Summary Card
function WalletStatCard({ label, value, icon, color }) {
  return (
    <div className="col-md-3 col-sm-6">
      <div className={`card border-0 shadow-sm bg-${color}-subtle`}>
        <div className="card-body d-flex align-items-center gap-3">
          <div className={`text-${color}`}>{icon}</div>
          <div>
            <h5 className="mb-0 fw-bold">₦{value.toLocaleString()}</h5>
            <small className="text-muted">{label}</small>
          </div>
        </div>
      </div>
    </div>
  );
}
