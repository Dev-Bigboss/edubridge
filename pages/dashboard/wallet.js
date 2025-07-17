import TutorLayout from "@/components/layout/TutorLayout";
import { useState } from "react";
import { CreditCard, DollarSign, ArrowDown, ArrowUp, Send } from "lucide-react";

export default function TutorWalletPage() {
  const [walletBalance, setWalletBalance] = useState(38500);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const transactions = [
    {
      id: 1,
      type: "credit",
      amount: 10000,
      description: "Session with Ada Obi",
      date: "2025-07-16",
    },
    {
      id: 2,
      type: "debit",
      amount: 5000,
      description: "Withdrawal processed",
      date: "2025-07-15",
    },
    {
      id: 3,
      type: "credit",
      amount: 15000,
      description: "Session with John Okafor",
      date: "2025-07-14",
    },
    {
      id: 4,
      type: "credit",
      amount: 8500,
      description: "Session with Zainab Musa",
      date: "2025-07-13",
    },
  ];

  const handleWithdraw = (e) => {
    e.preventDefault();

    if (parseInt(withdrawAmount) > walletBalance) {
      alert("Insufficient balance!");
      return;
    }

    alert(`Withdrawal request of ₦${withdrawAmount} submitted (mock).`);
    setWithdrawAmount("");
    setShowWithdrawModal(false);
  };

  return (
    <TutorLayout>
      <div className="mb-4">
        <h2 className="fw-bold">Wallet</h2>
        <p className="text-muted">Manage your balance and transactions</p>
      </div>

      {/* Wallet Summary */}
      <div className="row g-4 mb-4">
        <div className="col-md-6">
          <div className="bg-light rounded shadow-sm p-4 d-flex justify-content-between align-items-center">
            <div>
              <p className="text-muted mb-1">Current Balance</p>
              <h4 className="fw-bold text-success">
                ₦{walletBalance.toLocaleString()}
              </h4>
            </div>
            <DollarSign size={36} className="text-success" />
          </div>
        </div>

        <div className="col-md-6 d-flex align-items-center">
          <button
            className="btn btn-primary ms-auto"
            onClick={() => setShowWithdrawModal(true)}
          >
            <Send className="me-2" size={16} />
            Request Withdrawal
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent border-bottom">
          <h5 className="mb-0 fw-semibold">Transaction History</h5>
        </div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Amount (₦)</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td>{new Date(txn.date).toDateString()}</td>
                    <td>{txn.description}</td>
                    <td>
                      <span
                        className={`badge bg-${
                          txn.type === "credit" ? "success" : "danger"
                        }`}
                      >
                        {txn.type === "credit" ? (
                          <>
                            <ArrowDown size={12} className="me-1" />
                            Credit
                          </>
                        ) : (
                          <>
                            <ArrowUp size={12} className="me-1" />
                            Debit
                          </>
                        )}
                      </span>
                    </td>
                    <td>{txn.amount.toLocaleString()}</td>
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
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Request Withdrawal</h5>
                <button
                  className="btn-close"
                  onClick={() => setShowWithdrawModal(false)}
                />
              </div>
              <form onSubmit={handleWithdraw}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Amount (₦)</label>
                    <input
                      type="number"
                      required
                      className="form-control"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="Enter amount to withdraw"
                    />
                    <small className="text-muted">
                      Minimum ₦1,000. Max: ₦{walletBalance.toLocaleString()}
                    </small>
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowWithdrawModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </TutorLayout>
  );
}
