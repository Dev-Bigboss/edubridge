import { useState, useEffect } from "react";
import {
  PlusCircle,
  CreditCard,
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
} from "lucide-react";
import {
  useGetWalletBalanceWithAccountNumber,
  useGetWalletTransactions,
} from "@/hooks/queries";
import { useFundWallet } from "@/hooks/mutations";
import { useAuthStore } from "@/store/zustand";
import { v4 as uuidv4 } from "uuid";
import StudentLayout from "@/components/layout/StudentLayout";
import SkeletonLoader from "@/components/skeletons/dashboard";
import queryClient from "@/lib/queryClient";
import Spinner from "@/components/Spinner";

export default function StudentWallet() {
  const user = useAuthStore((state) => state.user);
  const { data: walletData, isLoading: loadingWallet } =
    useGetWalletBalanceWithAccountNumber(user?.accountNo);
  const { data: transactionsData, isLoading: loadingTransactions } =
    useGetWalletTransactions(user?.accountNo);
  const fundWallet = useFundWallet();
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [showFundModal, setShowFundModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (walletData) {
      setWallet((prev) => ({
        ...prev,
        balance: parseFloat(walletData.balance) || 0,
      }));
    }
    if (transactionsData?.transactions) {
      setWallet((prev) => ({
        ...prev,
        transactions: transactionsData.transactions.map((tx) => ({
          id: tx.id,
          type: tx.isCredit ? "credit" : "debit",
          amount: parseFloat(tx.amount),
          description: tx.narration,
          date: tx.transDate,
          transNo: tx.transNo,
          status: tx.status,
        })),
      }));
    }
  }, [walletData, transactionsData]);

  const handleFundWallet = (e) => {
    e.preventDefault();
    const payload = {
      accountNo: user?.accountNo,
      amount: parseInt(amount),
      paymentMethod: "card",
      reference: `PAY${uuidv4().replace(/-/g, "").slice(0, 10)}`,
    };
    fundWallet.mutate(payload, {
      onSuccess: () => {
        queryClient.invalidateQueries(["walletBalance", user?.accountNo]);
        queryClient.invalidateQueries(["walletTransactions", user?.accountNo]);
        setAmount("");
        setShowFundModal(false);
      },
      onError: (error) => {
        alert(`Failed to fund wallet: ${error.message}`);
      },
    });
  };

  const handleDownloadPDF = (tx) => {
    const latexContent = `
% Including a comprehensive preamble to ensure compatibility
\\documentclass[a4paper,12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage{geometry}
\\geometry{margin=1in}
\\usepackage{fancyhdr}
\\usepackage{lastpage}
\\usepackage{enumitem}
\\usepackage{xcolor}
\\usepackage{colortbl}
\\usepackage{booktabs}

% Setting up header and footer
\\pagestyle{fancy}
\\fancyhf{}
\\fhead{Transaction Details}
\\rfoot{Page \\thepage\\ of \\pageref{LastPage}}

% Defining colors
\\definecolor{headerblue}{RGB}{0, 51, 102}

% Customizing table
\\renewcommand{\\arraystretch}{1.2}

\\begin{document}

% Title section
\\begin{center}
    \\textbf{\\Large Transaction Receipt} \\
    \\vspace{0.2cm}
    \\textbf{Issued to: ${user?.firstName || "User"} ${user?.lastName || ""}} \\
    \\vspace{0.1cm}
    \\small \\today
\\end{center}

\\vspace{0.5cm}

% Transaction details table
\\begin{tabular}{ll}
    \\toprule
    \\rowcolor{headerblue!20}
    \\textbf{Field} & \\textbf{Details} \\
    \\midrule
    Transaction Number & ${tx.transNo} \\
    Date & ${new Date(tx.date).toLocaleString()} \\
    Description & ${tx.description} \\
    Amount & ₦${tx.amount.toLocaleString()} \\
    Type & ${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)} \\
    Status & ${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)} \\
    \\bottomrule
\\end{tabular}

\\end{document}
`;
    console.log("Generating PDF with LaTeX content:", latexContent);
    alert("PDF download initiated for transaction " + tx.transNo);
  };

  return (
    <StudentLayout>
      <div className="mb-4">
        <h3 className="fw-bold">My Wallet</h3>
        <p className="text-muted">Manage and monitor your wallet activity</p>
      </div>

      {/* Balance Card and Transactions */}
      {loadingWallet || loadingTransactions ? (
        <SkeletonLoader type="wallet" count={3} />
      ) : (
        <>
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
                disabled={fundWallet.isLoading}
              >
                {fundWallet.isPending ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Funding...
                  </>
                ) : (
                  <>
                    <PlusCircle className="me-2" size={16} />
                    Fund Wallet
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="card border-0 shadow-sm">
            <div className="card-header bg-transparent border-bottom fw-semibold">
              Transaction History
            </div>
            <div className="card-body p-0">
              <ul className="list-group list-group-flush">
                {wallet.transactions.length === 0 ? (
                  <li className="list-group-item text-center text-muted">
                    No transactions found
                  </li>
                ) : (
                  wallet.transactions.map((tx) => (
                    <li
                      key={tx.id}
                      className="list-group-item d-flex justify-content-between align-items-center cursor-pointer"
                      style={{ cursor: "pointer" }}
                      onClick={() => setSelectedTransaction(tx)}
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
                          <ArrowDownCircle
                            size={16}
                            className="ms-2 text-success"
                          />
                        ) : (
                          <ArrowUpCircle
                            size={16}
                            className="ms-2 text-danger"
                          />
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </>
      )}

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
                      disabled={fundWallet.isLoading}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowFundModal(false)}
                    disabled={fundWallet.isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary d-flex align-items-center"
                    disabled={fundWallet.isLoading}
                  >
                    {fundWallet.isPending ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Funding...
                      </>
                    ) : (
                      <>
                        <CreditCard className="me-2" size={16} />
                        Fund Now
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div
          className="modal fade show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold">Transaction Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedTransaction(null)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <strong>Transaction Number:</strong>{" "}
                  {selectedTransaction.transNo}
                </div>
                <div className="mb-3">
                  <strong>Date:</strong>{" "}
                  {new Date(selectedTransaction.date).toLocaleString()}
                </div>
                <div className="mb-3">
                  <strong>Description:</strong>{" "}
                  {selectedTransaction.description}
                </div>
                <div className="mb-3">
                  <strong>Amount:</strong> ₦
                  {selectedTransaction.amount.toLocaleString()}
                </div>
                <div className="mb-3">
                  <strong>Type:</strong>{" "}
                  {selectedTransaction.type.charAt(0).toUpperCase() +
                    selectedTransaction.type.slice(1)}
                </div>
                <div className="mb-3">
                  <strong>Status:</strong>{" "}
                  {selectedTransaction.status.charAt(0).toUpperCase() +
                    selectedTransaction.status.slice(1)}
                </div>
              </div>
              <div className="modal-footer border-0">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setSelectedTransaction(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleDownloadPDF(selectedTransaction)}
                >
                  <Download className="me-2" size={16} />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
