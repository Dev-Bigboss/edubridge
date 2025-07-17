// pages/admin/payments.js

import AdminLayout from "@/components/layout/AdminLayout";
import { useEffect, useState } from "react";
import {
  DollarSign,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Eye,
} from "lucide-react";

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false);

  useEffect(() => {
    // Mock payments data
    setPayments([
      {
        id: 1,
        type: "Tutor Payout",
        name: "Blessing Agbo",
        amount: 20000,
        status: "Paid",
        date: "2025-07-10",
        reference: "TXN123456",
        method: "Bank Transfer",
      },
      {
        id: 2,
        type: "Student Payment",
        name: "Zainab Musa",
        amount: 15000,
        status: "Pending",
        date: "2025-07-14",
        reference: "TXN987654",
        method: "Card",
      },
      {
        id: 3,
        type: "Tutor Payout",
        name: "Emeka Jude",
        amount: 30000,
        status: "Paid",
        date: "2025-07-05",
        reference: "TXN111222",
        method: "Bank Transfer",
      },
    ]);
  }, []);

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = filter === "all" || p.status.toLowerCase() === filter;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.reference.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status) => {
    const color =
      status === "Paid"
        ? "success"
        : status === "Pending"
        ? "warning"
        : "secondary";
    return (
      <span
        className={`badge bg-${color} bg-opacity-10 text-${color} border border-${color}`}
      >
        {status}
      </span>
    );
  };

  const handleProcessNewPayment = (e) => {
    e.preventDefault();
    alert("Payment processed successfully!");
    setShowNewPaymentModal(false);
  };

  return (
    <AdminLayout>
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h3 className="fw-bold">Payments</h3>
          <p className="text-muted mb-0">
            Manage all student and tutor transactions
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowNewPaymentModal(true)}
        >
          <Plus className="me-2" size={16} />
          New Payment
        </button>
      </div>

      {/* Filter & Search */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <select
            className="form-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div className="col-md-8">
          <div className="position-relative">
            <Search
              className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
              size={16}
            />
            <input
              type="text"
              className="form-control ps-5"
              placeholder="Search by name or reference"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table mb-0">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Method</th>
                <th>Amount (₦)</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.type}</td>
                  <td>{p.reference}</td>
                  <td>{p.method}</td>
                  <td>{p.amount.toLocaleString()}</td>
                  <td>{getStatusBadge(p.status)}</td>
                  <td>{new Date(p.date).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => {
                        setSelectedPayment(p);
                        setShowDetailModal(true);
                      }}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Detail Modal */}
      {showDetailModal && selectedPayment && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Payment Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedPayment(null);
                  }}
                />
              </div>
              <div className="modal-body">
                <p>
                  <strong>Name:</strong> {selectedPayment.name}
                </p>
                <p>
                  <strong>Type:</strong> {selectedPayment.type}
                </p>
                <p>
                  <strong>Amount:</strong> ₦
                  {selectedPayment.amount.toLocaleString()}
                </p>
                <p>
                  <strong>Reference:</strong> {selectedPayment.reference}
                </p>
                <p>
                  <strong>Method:</strong> {selectedPayment.method}
                </p>
                <p>
                  <strong>Status:</strong> {selectedPayment.status}
                </p>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(selectedPayment.date).toLocaleString()}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedPayment(null);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Payment Modal */}
      {showNewPaymentModal && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Process New Payment</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowNewPaymentModal(false)}
                />
              </div>
              <form onSubmit={handleProcessNewPayment}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Recipient Name
                    </label>
                    <input type="text" className="form-control" required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Amount (₦)</label>
                    <input type="number" className="form-control" required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Payment Method
                    </label>
                    <select className="form-select" required>
                      <option>Bank Transfer</option>
                      <option>Card</option>
                      <option>Wallet</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Reference</label>
                    <input type="text" className="form-control" required />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowNewPaymentModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Process Payment
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
