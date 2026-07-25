import { FormEvent, useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type Branch = {
  id: number;
  code: string;
  name_ar: string;
  city: string;
  is_active: boolean;
};

type Employee = {
  id: number;
  employee_no: string;
  full_name_ar: string;
  branch_id: number;
  branch_name: string;
  is_active: boolean;
};

type EmployeeTransfer = {
  id: number;
  employee_id: number;
  employee_no: string;
  employee_name: string;
  from_branch_id: number;
  from_branch_name: string;
  to_branch_id: number;
  to_branch_name: string;
  effective_date: string;
  reason: string;
  notes: string;
  created_by: string;
  created_at: string | null;
};

async function api(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const body = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(body?.detail ?? "تعذر تنفيذ العملية");
  return body;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function EmployeeTransfersPage({ token }: { token: string }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transfers, setTransfers] = useState<EmployeeTransfer[]>([]);
  const [employeeId, setEmployeeId] = useState(0);
  const [toBranchId, setToBranchId] = useState(0);
  const [effectiveDate, setEffectiveDate] = useState(todayIso());
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState(0);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedEmployee = employees.find((item) => item.id === employeeId);
  const availableBranches = branches.filter(
    (branch) => branch.is_active && branch.id !== selectedEmployee?.branch_id,
  );

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter(
      (employee) =>
        employee.full_name_ar.toLowerCase().includes(term) ||
        employee.employee_no.toLowerCase().includes(term),
    );
  }, [employees, search]);

  async function loadReferenceData() {
    const [employeeItems, branchItems] = await Promise.all([
      api("/api/v1/employees", token),
      api("/api/v1/branches", token),
    ]);
    setEmployees(employeeItems);
    setBranches(branchItems);
  }

  async function loadTransfers() {
    const params = new URLSearchParams();
    if (branchFilter) params.set("branch_id", String(branchFilter));
    if (fromDate) params.set("from_date", fromDate);
    if (toDate) params.set("to_date", toDate);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    setTransfers(await api(`/api/v1/employee-transfers${suffix}`, token));
  }

  useEffect(() => {
    setError("");
    Promise.all([loadReferenceData(), loadTransfers()]).catch((err) =>
      setError(err instanceof Error ? err.message : "تعذر تحميل البيانات"),
    );
  }, [token]);

  useEffect(() => {
    loadTransfers().catch((err) =>
      setError(err instanceof Error ? err.message : "تعذر تحميل سجل الانتقالات"),
    );
  }, [branchFilter, fromDate, toDate]);

  useEffect(() => {
    setToBranchId(availableBranches[0]?.id ?? 0);
  }, [employeeId, branches]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!employeeId || !toBranchId) {
      setError("اختر الموظف والفرع الجديد");
      return;
    }
    setLoading(true);
    try {
      await api(`/api/v1/employees/${employeeId}/transfers`, token, {
        method: "POST",
        body: JSON.stringify({
          to_branch_id: toBranchId,
          effective_date: effectiveDate,
          reason,
          notes,
        }),
      });
      setMessage("تم نقل الموظف وحفظ الحركة في السجل التاريخي");
      setEmployeeId(0);
      setReason("");
      setNotes("");
      setEffectiveDate(todayIso());
      await Promise.all([loadReferenceData(), loadTransfers()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر نقل الموظف");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl">
      <div className="page-title">
        <div>
          <h1>نقل الموظفين بين الفروع</h1>
          <p>نقل الموظف مع الحفاظ على تاريخ الحضور والرواتب والفروع السابقة</p>
        </div>
      </div>

      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      <form className="form-card" onSubmit={submit}>
        <label>
          بحث الموظف
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="الاسم أو كود الموظف"
          />
        </label>
        <label>
          الموظف
          <select
            required
            value={employeeId}
            onChange={(event) => setEmployeeId(Number(event.target.value))}
          >
            <option value={0}>اختر الموظف</option>
            {filteredEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.employee_no} — {employee.full_name_ar} — {employee.branch_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          الفرع الحالي
          <input readOnly value={selectedEmployee?.branch_name ?? "—"} />
        </label>
        <label>
          الفرع الجديد
          <select
            required
            value={toBranchId}
            onChange={(event) => setToBranchId(Number(event.target.value))}
          >
            <option value={0}>اختر الفرع الجديد</option>
            {availableBranches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name_ar} — {branch.city}
              </option>
            ))}
          </select>
        </label>
        <label>
          تاريخ سريان النقل
          <input
            required
            type="date"
            value={effectiveDate}
            onChange={(event) => setEffectiveDate(event.target.value)}
          />
        </label>
        <label>
          سبب النقل
          <input
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="اختياري"
          />
        </label>
        <label>
          ملاحظات
          <input
            maxLength={500}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="اختياري"
          />
        </label>
        <button disabled={loading}>{loading ? "جارٍ النقل..." : "اعتماد نقل الموظف"}</button>
      </form>

      <div className="filters-bar">
        <select value={branchFilter} onChange={(event) => setBranchFilter(Number(event.target.value))}>
          <option value={0}>كل الفروع</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name_ar}</option>
          ))}
        </select>
        <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        <button type="button" onClick={() => { setBranchFilter(0); setFromDate(""); setToDate(""); }}>
          مسح الفلاتر
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>كود الموظف</th>
              <th>اسم الموظف</th>
              <th>من فرع</th>
              <th>إلى فرع</th>
              <th>السبب</th>
              <th>الملاحظات</th>
              <th>نفذ بواسطة</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((transfer) => (
              <tr key={transfer.id}>
                <td>{transfer.effective_date}</td>
                <td>{transfer.employee_no}</td>
                <td>{transfer.employee_name}</td>
                <td>{transfer.from_branch_name}</td>
                <td><strong>{transfer.to_branch_name}</strong></td>
                <td>{transfer.reason || "—"}</td>
                <td>{transfer.notes || "—"}</td>
                <td>{transfer.created_by || "—"}</td>
              </tr>
            ))}
            {!transfers.length && (
              <tr>
                <td colSpan={8} className="no-data">لا توجد انتقالات مطابقة</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
