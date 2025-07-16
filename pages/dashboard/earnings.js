import { useEffect, useState, useRef } from "react";
import TutorLayout from "@/components/layout/TutorLayout";
import { DollarSign, CreditCard, Download, Plus, X } from "lucide-react";
import Chart from "chart.js/auto";

const mockEarnings = [
  { date: "2025-07-01", amount: 5000 },
  { date: "2025-07-03", amount: 10000 },
  { date: "2025-07-05", amount: 7500 },
  { date: "2025-07-07", amount: 12000 },
  { date: "2025-07-10", amount: 8500 },
];

const subjectBreakdown = [
  { subject: "Mathematics", amount: 35000 },
  { subject: "Physics", amount: 27000 },
  { subject: "English", amount: 18000 },
];

const paymentLogs = [
  { date: "2025-07-05", amount: 20000, status: "Paid" },
  { date: "2025-06-28", amount: 15000, status: "Paid" },
  { date: "2025-06-15", amount: 22000, status: "Paid" },
];

export default function EarningsPage() {
  const [earnings, setEarnings] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const chartRef = useRef(null);

  useEffect(() => {
    setEarnings(mockEarnings);

    const ctx = document.getElementById("earningsChart");
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    chartRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: mockEarnings.map((e) =>
          new Date(e.date).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
          })
        ),
        datasets: [
          {
            label: "Earnings (₦)",
            data: mockEarnings.map((e) => e.amount),
            fill: true,
            tension: 0.4,
            borderColor: "#3f51b5",
            backgroundColor: "rgba(63,81,181,0.1)",
            pointBackgroundColor: "#3f51b5",
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  }, []);

  const handleWithdraw = () => {
    if (withdrawAmount) {
      alert(
        `Withdrawal of ₦${Number(withdrawAmount).toLocaleString()} requested`
      );
      setWithdrawAmount("");
      setShowWithdrawModal(false);
    }
  };

  return (
    <TutorLayout>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold">Earnings</h3>
        <button
          className="btn btn-primary d-flex align-items-center"
          onClick={() => setShowWithdrawModal(true)}
        >
          <Download size={18} className="me-2" />
          Request Withdrawal
        </button>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="bg-success bg-opacity-10 border rounded-3 p-3">
            <h6 className="text-success fw-bold mb-1">Total Earnings</h6>
            <h4 className="fw-bold">
              ₦
              {mockEarnings
                .reduce((sum, e) => sum + e.amount, 0)
                .toLocaleString()}
            </h4>
          </div>
        </div>
        <div className="col-md-4">
          <div className="bg-info bg-opacity-10 border rounded-3 p-3">
            <h6 className="text-info fw-bold mb-1">Pending Withdrawals</h6>
            <h4 className="fw-bold">₦10,000</h4>
          </div>
        </div>
        <div className="col-md-4">
          <div className="bg-warning bg-opacity-10 border rounded-3 p-3">
            <h6 className="text-warning fw-bold mb-1">Total Withdrawn</h6>
            <h4 className="fw-bold">₦57,000</h4>
          </div>
        </div>
      </div>

      {/* Chart and Subject Breakdown Side by Side */}
      <div className="row g-4 mb-5">
        <div className="col-lg-7">
          <div className="bg-white rounded shadow-sm p-3">
            <h6 className="fw-bold mb-3">Earnings Trend</h6>
            <canvas id="earningsChart" height="200" />
          </div>
        </div>
        <div className="col-lg-5">
          <div className="bg-white rounded shadow-sm p-3 h-100">
            <h6 className="fw-bold mb-3">Earnings by Subject</h6>
            <ul className="list-group">
              {subjectBreakdown.map((s, i) => (
                <li
                  key={i}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  {s.subject}
                  <span className="fw-semibold">
                    ₦{s.amount.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="card border-0 shadow-sm mb-5">
        <div className="card-body">
          <h6 className="fw-bold mb-3">Payment History</h6>
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentLogs.map((p, i) => (
                  <tr key={i}>
                    <td>{new Date(p.date).toLocaleDateString()}</td>
                    <td>₦{p.amount.toLocaleString()}</td>
                    <td>
                      <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">Request Withdrawal</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowWithdrawModal(false)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-semibold">Amount (₦)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Enter amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowWithdrawModal(false)}
                  >
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleWithdraw}>
                    Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </TutorLayout>
  );
}
