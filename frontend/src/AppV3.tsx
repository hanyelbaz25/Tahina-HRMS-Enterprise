import { useEffect, useState } from "react";
import { ArrowLeftRight, X } from "lucide-react";
import { App } from "./App";
import EmployeeTransfersPage from "./employee-transfers/EmployeeTransfersPage";

export function AppV3() {
  const [showTransfers, setShowTransfers] = useState(false);
  const [token, setToken] = useState(() => localStorage.getItem("tahina_token") ?? "");

  useEffect(() => {
    const sync = () => setToken(localStorage.getItem("tahina_token") ?? "");
    const timer = window.setInterval(sync, 500);
    window.addEventListener("storage", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!token) setShowTransfers(false);
  }, [token]);

  if (showTransfers && token) {
    return (
      <div className="v3-feature-shell" dir="rtl">
        <div className="v3-feature-toolbar">
          <div>
            <strong>Tahina HRMS Enterprise v3</strong>
            <small>محرك نقل وتعيين الموظفين</small>
          </div>
          <button type="button" onClick={() => setShowTransfers(false)}>
            <X size={18} /> العودة للنظام
          </button>
        </div>
        <main className="v3-feature-content">
          <EmployeeTransfersPage token={token} />
        </main>
      </div>
    );
  }

  return (
    <>
      <App />
      {token && (
        <button
          type="button"
          className="employee-transfer-launcher"
          onClick={() => setShowTransfers(true)}
          title="نقل الموظفين بين الفروع"
        >
          <ArrowLeftRight size={21} />
          <span>نقل الموظفين</span>
        </button>
      )}
    </>
  );
}
