import StudentLayout from "@/components/layout/StudentLayout";
import { useState, useEffect } from "react";
import {
  PlusCircle,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";

export default function StudentWallet() {
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [showFundModal, setShowFundModal] = useState(false);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    // Simulated data
    setWallet({
      balance: 15000,
      transactions: [
        {
          id: 1,
          type: "credit",
          amount: 5000,
          description: "Wallet Funding",
          date: "2025-07-10",
        },
        {
          id: 2,
          type: "debit",
          amount: 2000,
          description: "Session with Ada Obi",
          date: "2025-07-12",
        },
        {
          id: 3,
          type: "credit",
          amount: 12000,
          description: "Wallet Funding",
          date: "2025-07-14",
        },
      ],
    });
  }, []);

  const handleFundWallet = (e) => {
    e.preventDefault();
    const newTx = {
      id: wallet.transactions.length + 1,
      type: "credit",
      amount: parseInt(amount),
      description: "Manual Funding",
      date: new Date().toISOString().slice(0, 10),
    };

    setWallet((prev) => ({
      balance: prev.balance + parseInt(amount),
      transactions: [newTx, ...prev.transactions],
    }));
    setAmount("");
    setShowFundModal(false);
  };

  return (
    <StudentLayout>
      <div className="mb-4">
        <h3 className="fw-bold">My Wallet</h3>
        <p className="text-muted">Manage and monitor your wallet activity</p>
      </div>

      {/* Balance Card */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body d-flex justify-content-between align-items-center">
          <div>
            <h6 className="text-muted mb-1">Current Balance</h6>
            <h3 className="fw-bold text-success">
              ₦{wallet.balance.toLocaleString()}
            </h3>
          </div>
          <button
            className="btn btn-outline-primary d-flex align-items-center"
            onClick={() => setShowFundModal(true)}
          >
            <PlusCircle className="me-2" size={16} />
            Fund Wallet
          </button>
        </div>
      </div>

      {/* Transactions */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent border-bottom fw-semibold">
          Transaction History
        </div>
        <div className="card-body p-0">
          <ul className="list-group list-group-flush">
            {wallet.transactions.map((tx) => (
              <li
                key={tx.id}
                className="list-group-item d-flex justify-content-between align-items-center"
              >
                <div>
                  <h6 className="mb-1">{tx.description}</h6>
                  <small className="text-muted">
                    {new Date(tx.date).toLocaleDateString()}
                  </small>
                </div>
                <div
                  className={`fw-bold ${
                    tx.type === "credit" ? "text-success" : "text-danger"
                  }`}
                >
                  {tx.type === "credit" ? "+" : "-"}₦
                  {tx.amount.toLocaleString()}
                  {tx.type === "credit" ? (
                    <ArrowDownCircle size={16} className="ms-2 text-success" />
                  ) : (
                    <ArrowUpCircle size={16} className="ms-2 text-danger" />
                  )}
                </div>
              </li>
            ))}
            {wallet.transactions.length === 0 && (
              <li className="list-group-item text-center text-muted">
                No transactions found
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Fund Modal */}
      {showFundModal && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Fund Wallet</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowFundModal(false)}
                />
              </div>
              <form onSubmit={handleFundWallet}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Amount (₦)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                      min={100}
                      placeholder="Enter amount"
                    />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowFundModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <CreditCard className="me-2" size={16} />
                    Fund Now
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
