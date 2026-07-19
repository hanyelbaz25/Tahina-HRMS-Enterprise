import { FormEvent, useEffect, useState } from "react";
import {
  Building2,
  CalendarClock,
  Download,
  FileWarning,
  LayoutDashboard,
  LogOut,
  Pencil,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  WalletCards,
  UserCog,
} from "lucide-react";
import ReportsPage from "./reports/ReportsPage";


const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
type User = {
  username: string;
  full_name: string;
  role: "system_admin" | "hr_manager";
  role_label: string;
};
type ManagedUser = User & {
  id: number;
  is_active: boolean;
  created_at: string | null;
};
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
  identity_no: string;
  phone: string;
  job_title: string;
  basic_salary: number;
  allowances: number;
  branch_id: number;
  branch_name: string;
  is_active: boolean;
};
type Attendance = {
  id: number;
  employee_id: number;
  employee_no: string;
  employee_name: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  notes: string;
  source: string;
};
type Payroll = {
  id: number;
  branch_id: number;
  employee_no: string;
  employee_name: string;
  branch_name: string;
  job_title: string;
  payroll_month: string;
  basic_salary: number;
  allowances: number;
  work_days: number;
  addition_days: number;
  addition_amount: number;
  additions: number;
  deduction_days: number;
  leave_deduction_days: number;
  deduction_amount: number;
  deductions: number;
  daily_charges: number;
  applied_daily_charges: number;
  daily_rewards: number;
  applied_daily_rewards: number;
  day_value: number;
  net_salary: number;
  notes: string;
  source: string;
};
type EmployeeCharge = {
  id: number;
  employee_id: number;
  employee_no: string;
  employee_name: string;
  branch_name: string;
  branch_id: number;
  charge_date: string;
  charge_type: "advance" | "order" | "penalty" | "reward";
  amount: number;
  deduction_start_month: string;
  installment_count: number;
  funding_source: "branch" | "treasury" | "bank";
  monthly_amount: number;
  notes: string;
  created_by: string;
};
type Page =
  | "dashboard"
  | "employees"
  | "branches"
  | "attendance"
  | "documents"
  | "leaves"
  | "charges"
  | "payroll"
  | "users"
  | "audit"
  | "reports";

async function api(path: string, token: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const result = await response.json();
  if (!response.ok) throw new Error(result.detail ?? "تعذر تنفيذ العملية");
  return result;
}

function Login({ onLogin }: { onLogin: (token: string, user: User) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? "تعذر تسجيل الدخول");
      onLogin(result.access_token, result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="login-page" dir="rtl">
      <form className="login-card" onSubmit={submit}>
        <div className="login-brand">
          <b>ط</b>
          <div>
            <h1>Tahina HRMS</h1>
            <p>نظام إدارة الموارد البشرية</p>
          </div>
        </div>
        <h2>تسجيل الدخول</h2>
        <label>
          اسم المستخدم
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          كلمة المرور
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <div className="error">{error}</div>}
        <button disabled={loading}>
          {loading ? "جارٍ تسجيل الدخول..." : "دخول"}
        </button>
        <small>الدخول متاح لمدير النظام ومسؤول الموارد البشرية</small>
      </form>
    </div>
  );
}

function Branches({
  token,
  isAdmin,
  onChanged,
}: {
  token: string;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const empty = { name_ar: "", city: "", is_active: true };
  const [items, setItems] = useState<Branch[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState("");
  const load = () =>
    api("/api/v1/branches", token)
      .then(setItems)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void load();
  }, [token]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api(`/api/v1/branches${editing ? `/${editing}` : ""}`, token, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      setForm(empty);
      setEditing(null);
      load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  function edit(item: Branch) {
    setEditing(item.id);
    setForm({
      name_ar: item.name_ar,
      city: item.city,
      is_active: item.is_active,
    });
  }
  async function remove(id: number) {
    if (!confirm("هل تريد حذف هذا الفرع؟")) return;
    try {
      await api(`/api/v1/branches/${id}`, token, { method: "DELETE" });
      load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <>
      <PageTitle title="الفروع" text="إدارة فروع المنشأة والمدن التابعة لها" />
      {error && <div className="error">{error}</div>}
        <form className="crud-form" onSubmit={submit}>
          <input
            placeholder="اسم الفرع"
            value={form.name_ar}
            onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
            required
          />
          <input
            placeholder="المدينة"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            required
          />
          <label className="check">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
            />
            نشط
          </label>
          <button>{editing ? "حفظ التعديل" : "إضافة فرع"}</button>
          {editing && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setEditing(null);
                setForm(empty);
              }}
            >
              إلغاء
            </button>
          )}
        </form>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الكود</th>
              <th>اسم الفرع</th>
              <th>المدينة</th>
              <th>الحالة</th>
              {isAdmin && <th>إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id}>
                <td>{x.code}</td>
                <td>{x.name_ar}</td>
                <td>{x.city}</td>
                <td>
                  <Status active={x.is_active} />
                </td>
                {isAdmin && (
                  <td className="actions">
                    <button onClick={() => edit(x)}>
                      <Pencil size={17} />
                    </button>
                    <button className="danger" onClick={() => remove(x.id)}>
                      <Trash2 size={17} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={5} className="no-data">
                  لا توجد فروع بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Employees({
  token,
  isAdmin,
  onChanged,
}: {
  token: string;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const blank = {
    full_name_ar: "",
    identity_no: "",
    phone: "",
    job_title: "",
    basic_salary: 0,
    allowances: 0,
    branch_id: 0,
    is_active: true,
  };
  const [items, setItems] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [employeeBranchFilter, setEmployeeBranchFilter] = useState(0);

const filteredEmployees =
  employeeBranchFilter === 0
    ? items
    : items.filter((e) => e.branch_id === employeeBranchFilter);
   const employeeCount = filteredEmployees.length; 
  const load = () =>
    api(`/api/v1/employees?search=${encodeURIComponent(search)}`, token)
      .then(setItems)
      .catch((e) => setError(e.message));
  useEffect(() => {
    api("/api/v1/branches", token).then((x: Branch[]) => {
      setBranches(x);
      if (x.length)
        setForm((f) => ({ ...f, branch_id: f.branch_id || x[0].id }));
    });
  }, [token]);
  useEffect(() => {
    void load();
  }, [token, search]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api(`/api/v1/employees${editing ? `/${editing}` : ""}`, token, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      setForm({ ...blank, branch_id: branches[0]?.id ?? 0 });
      setEditing(null);
      load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  function edit(x: Employee) {
    setEditing(x.id);
    setForm({
      full_name_ar: x.full_name_ar,
      identity_no: x.identity_no,
      phone: x.phone,
      job_title: x.job_title,
      basic_salary: x.basic_salary,
      allowances: x.allowances,
      branch_id: x.branch_id,
      is_active: x.is_active,
    });
  }
  async function importFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch(`${API_URL}/api/v1/employees/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      setResult(
        `تمت إضافة ${data.created} موظف وتحديث ${data.updated} وإنشاء ${data.branches_created} فرع، والأخطاء ${data.errors_total}`,
      );
      load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
    e.target.value = "";
  }
  async function remove(id: number) {
    if (!confirm("هل تريد حذف هذا الموظف؟")) return;
    try {
      await api(`/api/v1/employees/${id}`, token, { method: "DELETE" });
      load();
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <>
      <PageTitle title="الموظفون" text="إضافة الموظفين وربطهم بالفروع" />
      {error && <div className="error">{error}</div>}
      {result && <div className="success">{result}</div>}
      <div className="attendance-tools">
        <label className="upload">
          <Upload size={18} />
          استيراد موظفين من Excel
          <input type="file" accept=".xlsx" onChange={importFile} />
        </label>
      </div>
      {!branches.length && (
        <div className="notice">أضف فرعًا أولًا قبل إضافة الموظفين.</div>
      )}
      <div className="full-width">
  <label>فلترة الموظفين حسب الفرع</label>
  <select
  value={employeeBranchFilter}
  onChange={(e) => setEmployeeBranchFilter(Number(e.target.value))}>
  <option value={0}>كل الفروع</option>

  {branches.map((b) => (
    <option key={b.id} value={b.id}>
      {b.name_ar}
    </option>
  ))}
</select>
<div className="employee-count">
عدد الموظفين: {employeeCount}
</div>
</div>
<form className="crud-form employee-form" onSubmit={submit}>
  <input
  placeholder="اسم الموظف بالعربية"
  value={form.full_name_ar}
  onChange={(e) => setForm({ ...form, full_name_ar: e.target.value })}
 required
/>
        <input
          placeholder="رقم الهوية / الإقامة"
          value={form.identity_no}
          onChange={(e) => setForm({ ...form, identity_no: e.target.value })}
          required
        />
        <input
          placeholder="رقم الجوال"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          placeholder="المسمى الوظيفي"
          value={form.job_title}
          onChange={(e) => setForm({ ...form, job_title: e.target.value })}
          required
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="الراتب الأساسي"
          value={form.basic_salary || ""}
          onChange={(e) =>
            setForm({ ...form, basic_salary: Number(e.target.value) })
          }
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="البدلات"
          value={form.allowances || ""}
          onChange={(e) =>
            setForm({ ...form, allowances: Number(e.target.value) })
          }
        />
        <select
          value={form.branch_id}
          onChange={(e) =>
            setForm({ ...form, branch_id: Number(e.target.value) })
          }
          required
        >
          {branches.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name_ar}
            </option>
          ))}
        </select>
        <label className="check">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          على رأس العمل
        </label>
        <button disabled={!branches.length}>
          {editing ? "حفظ التعديل" : "إضافة موظف"}
        </button>
        {editing && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setEditing(null);
              setForm({ ...blank, branch_id: branches[0]?.id ?? 0 });
            }}
          >
            إلغاء
          </button>
        )}
      </form>
      <div className="search">
        <input
          placeholder="بحث بالاسم أو الرقم أو الهوية"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>رقم الموظف</th>
              <th>الاسم</th>
              <th>الوظيفة</th>
              <th>الفرع</th>
              <th>الراتب الأساسي</th>
              <th>البدلات</th>
              <th>الحالة</th>
              {isAdmin && <th>إجراءات</th>}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((x) => (
              <tr key={x.id}>
                <td>{x.employee_no}</td>
                <td>
                  {x.full_name_ar}
                  <small>{x.identity_no}</small>
                </td>
                <td>{x.job_title}</td>
                <td>{x.branch_name}</td>
                <td>{x.basic_salary.toLocaleString("ar-SA")} ر.س</td>
                <td>{x.allowances.toLocaleString("ar-SA")} ر.س</td>
                <td>
                  <Status active={x.is_active} />
                </td>
                {isAdmin && <td className="actions">
                  <button onClick={() => edit(x)}>
                    <Pencil size={17} />
                  </button>
                  <button className="danger" onClick={() => remove(x.id)}>
                    <Trash2 size={17} />
                  </button>
                </td>}
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={8} className="no-data">
                  لا توجد بيانات موظفين
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
  );
}
function PageTitle({ title, text }: { title: string; text: string }) {
  return (
    <div className="page-title">
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
function Status({ active }: { active: boolean }) {
  return (
    <span className={`status ${active ? "on" : "off"}`}>
      {active ? "نشط" : "غير نشط"}
    </span>
  );
}

function AttendancePage({ token, isAdmin }: { token: string; isAdmin: boolean }) {
  const today = new Date().toISOString().slice(0, 10),
    blank = {
      employee_id: 0,
      work_date: today,
      check_in: "",
      check_out: "",
      notes: "",
    };
  const [employees, setEmployees] = useState<Employee[]>([]),
    [items, setItems] = useState<Attendance[]>([]),
    [form, setForm] = useState(blank),
    [filterDate, setFilterDate] = useState(today),
    [error, setError] = useState(""),
    [result, setResult] = useState("");
  const load = () =>
    api(`/api/v1/attendance?work_date=${filterDate}`, token)
      .then(setItems)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void api("/api/v1/employees", token).then((x: Employee[]) => {
      setEmployees(x);
      if (x.length)
        setForm((f) => ({ ...f, employee_id: f.employee_id || x[0].id }));
    });
  }, [token]);
  useEffect(() => {
    void load();
  }, [token, filterDate]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/v1/attendance/manual", token, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          check_in: form.check_in || null,
          check_out: form.check_out || null,
        }),
      });
      setResult("تم حفظ الحضور بنجاح");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch(`${API_URL}/api/v1/attendance/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      setResult(
        `تم استيراد ${data.imported} وتحديث ${data.updated}، والأخطاء ${data.errors_total}`,
      );
      load();
    } catch (err) {
      setError((err as Error).message);
    }
    e.target.value = "";
  }
  async function remove(id: number) {
    if (!confirm("حذف سجل الحضور؟")) return;
    await api(`/api/v1/attendance/${id}`, token, { method: "DELETE" });
    load();
  }
  return (
    <>
      <PageTitle
        title="الحضور والانصراف"
        text="تسجيل يدوي أو استيراد سجلات جهاز البصمة من Excel"
      />
      {error && <div className="error">{error}</div>}
      {result && <div className="success">{result}</div>}
      <div className="attendance-tools">
        <a className="template" href="/attendance-template.xlsx" download>
          <Download size={18} />
          تحميل قالب Excel
        </a>
        <label className="upload">
          <Upload size={18} />
          استيراد ملف Excel
          <input type="file" accept=".xlsx" onChange={uploadFile} />
        </label>
      </div>
      <form className="crud-form employee-form" onSubmit={submit}>
        <select
          value={form.employee_id}
          onChange={(e) =>
            setForm({ ...form, employee_id: Number(e.target.value) })
          }
          required
        >
          {employees.map((x) => (
            <option key={x.id} value={x.id}>
              {x.employee_no} - {x.full_name_ar}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={form.work_date}
          onChange={(e) => setForm({ ...form, work_date: e.target.value })}
          required
        />
        <input
          type="time"
          value={form.check_in}
          onChange={(e) => setForm({ ...form, check_in: e.target.value })}
        />
        <input
          type="time"
          value={form.check_out}
          onChange={(e) => setForm({ ...form, check_out: e.target.value })}
        />
        <input
          placeholder="ملاحظات"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <button disabled={!employees.length}>حفظ السجل</button>
      </form>
      <div className="search">
        <label>
          عرض تاريخ:{" "}
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الموظف</th>
              <th>التاريخ</th>
              <th>الحضور</th>
              <th>الانصراف</th>
              <th>المصدر</th>
              <th>ملاحظات</th>
              <th>إجراء</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id}>
                <td>
                  {x.employee_no}
                  <small>{x.employee_name}</small>
                </td>
                <td>{x.work_date}</td>
                <td>{x.check_in ?? "—"}</td>
                <td>{x.check_out ?? "—"}</td>
                <td>{x.source === "excel" ? "Excel" : "يدوي"}</td>
                <td>{x.notes || "—"}</td>
                <td className="actions">
                  {isAdmin && <button className="danger" onClick={() => remove(x.id)}>
                    <Trash2 size={17} />
                  </button>}
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={7} className="no-data">
                  لا توجد سجلات في هذا التاريخ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DocumentsPage({ token, isAdmin }: { token: string; isAdmin: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    employee_id: 0,
    document_type: "contract",
    document_no: "",
    start_date: today,
    expiry_date: today,
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const load = () =>
    api("/api/v1/documents", token)
      .then(setItems)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void api("/api/v1/employees", token).then((data: Employee[]) => {
      setEmployees(data);
      if (data.length) setForm((x) => ({ ...x, employee_id: data[0].id }));
    });
    void load();
  }, [token]);
  const filteredEmployees = employees.filter(
    (x) =>
      !search.trim() ||
      x.full_name_ar.toLowerCase().includes(search.trim().toLowerCase()) ||
      x.employee_no.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const visible = items.filter(
    (x) => filter === "all" || x.document_type === filter,
  );
  const typeLabel = (type: string) =>
    type === "contract" ? "عقد عمل" : "إقامة";
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) =>
      body.append(key, String(value)),
    );
    if (file) body.append("file", file);
    try {
      const response = await fetch(`${API_URL}/api/v1/documents`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      setMessage("تم حفظ المستند");
      setFile(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function remove(id: number) {
    if (!confirm("هل تريد حذف المستند وملفه؟")) return;
    try {
      await api(`/api/v1/documents/${id}`, token, { method: "DELETE" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function download(id: number, name: string) {
    try {
      const response = await fetch(`${API_URL}/api/v1/documents/${id}/file`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("تعذر تنزيل الملف");
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = name || "document";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  }
  function printReport() {
    const expiring = visible.filter((x) => x.days_remaining <= 90);
    const p = window.open("", "_blank", "width=1100,height=800");
    if (!p) return;
    const rows = expiring
      .map(
        (x) =>
          `<tr><td>${x.employee_no}</td><td>${x.employee_name}</td><td>${x.branch_name}</td><td>${typeLabel(x.document_type)}</td><td>${x.document_no || "—"}</td><td>${x.start_date || "—"}</td><td>${x.expiry_date}</td><td>${x.days_remaining < 0 ? `منتهي منذ ${Math.abs(x.days_remaining)} يوم` : `${x.days_remaining} يوم`}</td></tr>`,
      )
      .join("");
    p.document.write(
      `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>تقرير العقود والإقامات</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Tahoma;font-size:11px}header{display:flex;justify-content:center;align-items:center;gap:15px;text-align:center}header img{width:70px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #666;padding:6px;text-align:center}th{background:#eee}.actions{text-align:center;margin:15px}@media print{.actions{display:none}}</style></head><body><header><img src="${location.origin}/tahina-logo.png"><h1>العقود والإقامات المنتهية أو القريبة من الانتهاء</h1></header><table><thead><tr><th>الكود</th><th>الموظف</th><th>الفرع</th><th>النوع</th><th>الرقم</th><th>البداية</th><th>الانتهاء</th><th>الحالة</th></tr></thead><tbody>${rows || '<tr><td colspan="8">لا توجد مستندات قريبة من الانتهاء</td></tr>'}</tbody></table><div class="actions"><button onclick="window.print()">طباعة أو حفظ PDF</button></div></body></html>`,
    );
    p.document.close();
  }
  return (
    <>
      <PageTitle
        title="العقود والإقامات"
        text="حفظ البيانات والمرفقات والتنبيه قبل الانتهاء بـ90 يومًا"
      />
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}
      <form className="crud-form employee-form" onSubmit={save}>
        <input
          type="search"
          placeholder="ابحث باسم الموظف أو الكود"
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            setSearch(value);
            const q = value.trim().toLowerCase();
            const first = employees.find(
              (x) =>
                !q ||
                x.full_name_ar.toLowerCase().includes(q) ||
                x.employee_no.toLowerCase().includes(q),
            );
            setForm({ ...form, employee_id: first?.id ?? 0 });
          }}
        />
        <select
          value={form.employee_id}
          onChange={(e) =>
            setForm({ ...form, employee_id: Number(e.target.value) })
          }
        >
          {filteredEmployees.map((x) => (
            <option key={x.id} value={x.id}>
              {x.employee_no} - {x.full_name_ar}
            </option>
          ))}
        </select>
        <select
          value={form.document_type}
          onChange={(e) => setForm({ ...form, document_type: e.target.value })}
        >
          <option value="contract">عقد عمل</option>
          <option value="iqama">إقامة</option>
        </select>
        <input
          placeholder="رقم العقد أو الإقامة"
          value={form.document_no}
          onChange={(e) => setForm({ ...form, document_no: e.target.value })}
        />
        <input
          type="date"
          title="تاريخ البداية"
          value={form.start_date}
          onChange={(e) => setForm({ ...form, start_date: e.target.value })}
        />
        <input
          type="date"
          title="تاريخ الانتهاء"
          value={form.expiry_date}
          onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
        />
        <input
          placeholder="ملاحظات"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button>حفظ المستند</button>
      </form>
      <div className="search">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">الكل</option>
          <option value="contract">العقود</option>
          <option value="iqama">الإقامات</option>
        </select>
        <button className="print-button" onClick={printReport}>
          تقرير المنتهية والقريبة PDF
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الفرع</th>
              <th>النوع</th>
              <th>الرقم</th>
              <th>البداية</th>
              <th>الانتهاء</th>
              <th>التنبيه</th>
              <th>الملف</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((x) => (
              <tr key={x.id}>
                <td>
                  {x.employee_no}
                  <small>{x.employee_name}</small>
                </td>
                <td>{x.branch_name}</td>
                <td>{typeLabel(x.document_type)}</td>
                <td>{x.document_no || "—"}</td>
                <td>{x.start_date || "—"}</td>
                <td>{x.expiry_date}</td>
                <td>
                  {x.days_remaining < 0
                    ? `منتهي منذ ${Math.abs(x.days_remaining)} يوم`
                    : x.days_remaining <= 90
                      ? `متبقي ${x.days_remaining} يوم`
                      : "ساري"}
                </td>
                <td>
                  {x.has_file ? (
                    <button
                      className="print-button"
                      onClick={() => download(x.id, x.original_file_name)}
                    >
                      تنزيل
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {isAdmin && <button className="danger" onClick={() => remove(x.id)}>
                    <Trash2 size={16} />
                  </button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function LeavesPage({ token, isAdmin }: { token: string; isAdmin: boolean }) {
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [year, setYear] = useState(currentYear);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    employee_id: 0,
    leave_type: "annual",
    start_date: today,
    end_date: today,
    reason: "",
  });
  const leaveLabel = (type: string) =>
    type === "annual"
      ? "سنوية"
      : type === "sick"
        ? "مرضية"
        : type === "unpaid"
          ? "بدون راتب"
          : "غياب غير مبرر";
  const statusLabel = (status: string) =>
    status === "approved"
      ? "معتمدة"
      : status === "rejected"
        ? "مرفوضة"
        : "قيد المراجعة";
  const load = () =>
    Promise.all([
      api(`/api/v1/leaves?year=${year}`, token),
      api(`/api/v1/leaves/balances?year=${year}`, token),
    ])
      .then(([a, b]) => {
        setItems(a);
        setBalances(b);
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    void api("/api/v1/employees", token).then((data: Employee[]) => {
      setEmployees(data);
      if (data.length) setForm((x) => ({ ...x, employee_id: data[0].id }));
    });
  }, [token]);
  useEffect(() => {
    void load();
  }, [token, year]);
  const filtered = employees.filter(
    (x) =>
      !search.trim() ||
      x.full_name_ar.toLowerCase().includes(search.trim().toLowerCase()) ||
      x.employee_no.toLowerCase().includes(search.trim().toLowerCase()),
  );
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      const r = await api("/api/v1/leaves", token, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(r.message);
      setError("");
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function decide(id: number, action: string) {
    try {
      const r = await api(`/api/v1/leaves/${id}/${action}`, token, {
        method: "POST",
      });
      setMessage(r.message);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function remove(id: number) {
    if (!confirm("هل تريد حذف طلب الإجازة؟")) return;
    try {
      await api(`/api/v1/leaves/${id}`, token, { method: "DELETE" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function printReport() {
    try {
      const data = await api(
        `/api/v1/leaves/movement-report?year=${year}`,
        token,
      );
      const p = window.open("", "_blank", "width=1100,height=800");
      if (!p) return;
      const rows = (list: any[]) =>
        list
          .map(
            (x) =>
              `<tr><td>${x.employee_no}</td><td>${x.employee_name}</td><td>${x.branch_name}</td><td>${leaveLabel(x.leave_type)}</td><td>${x.start_date}</td><td>${x.end_date}</td><td>${x.return_date}</td><td>${x.days}</td></tr>`,
          )
          .join("");
      p.document.write(
        `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>تقرير حركة الإجازات</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Tahoma;font-size:11px}header{display:flex;justify-content:center;align-items:center;gap:15px;text-align:center}header img{width:70px}table{width:100%;border-collapse:collapse;margin-bottom:18px}th,td{border:1px solid #666;padding:6px;text-align:center}th{background:#eee}.actions{text-align:center}@media print{.actions{display:none}}</style></head><body><header><img src="${location.origin}/tahina-logo.png"><div><h1>تقرير حركة الإجازات</h1><b>سنة ${year}</b></div></header><h2>الموجودون حاليًا في إجازة</h2><table><thead><tr><th>الكود</th><th>الموظف</th><th>الفرع</th><th>النوع</th><th>البداية</th><th>النهاية</th><th>العودة</th><th>الأيام</th></tr></thead><tbody>${rows(data.on_leave) || '<tr><td colspan="8">لا يوجد موظفون في إجازة حاليًا</td></tr>'}</tbody></table><h2>العائدون من الإجازات</h2><table><thead><tr><th>الكود</th><th>الموظف</th><th>الفرع</th><th>النوع</th><th>البداية</th><th>النهاية</th><th>تاريخ العودة</th><th>الأيام</th></tr></thead><tbody>${rows(data.returned) || '<tr><td colspan="8">لا توجد عودة مسجلة</td></tr>'}</tbody></table><div class="actions"><button onclick="window.print()">طباعة أو حفظ PDF</button></div></body></html>`,
      );
      p.document.close();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        title="الإجازات والأرصدة"
        text="الرصيد السنوي 30 يومًا مع تواريخ البداية والنهاية والعودة"
      />
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}
      <form className="crud-form employee-form" onSubmit={save}>
        <input
          type="search"
          placeholder="ابحث باسم الموظف أو الكود"
          value={search}
          onChange={(e) => {
            const value = e.target.value;
            setSearch(value);
            const normalized = value.trim().toLowerCase();
            const firstMatch = employees.find(
              (employee) =>
                !normalized ||
                employee.full_name_ar.toLowerCase().includes(normalized) ||
                employee.employee_no.toLowerCase().includes(normalized),
            );
            setForm({ ...form, employee_id: firstMatch?.id ?? 0 });
          }}
        />
        <select
          value={form.employee_id}
          onChange={(e) =>
            setForm({ ...form, employee_id: Number(e.target.value) })
          }
        >
          {filtered.map((x) => (
            <option key={x.id} value={x.id}>
              {x.employee_no} - {x.full_name_ar}
            </option>
          ))}
        </select>
        <select
          value={form.leave_type}
          onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
        >
          <option value="annual">سنوية</option>
          <option value="sick">مرضية</option>
          <option value="unpaid">بدون راتب</option>
          <option value="unexcused">غياب غير مبرر</option>
        </select>
        <input
          type="date"
          title="تاريخ بداية الإجازة"
          value={form.start_date}
          onChange={(e) => setForm({ ...form, start_date: e.target.value })}
        />
        <input
          type="date"
          title="تاريخ نهاية الإجازة"
          value={form.end_date}
          onChange={(e) => setForm({ ...form, end_date: e.target.value })}
        />
        <input
          placeholder="السبب أو الملاحظات"
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
        <button>تسجيل الطلب</button>
      </form>
      <div className="search">
        <label>
          السنة:{" "}
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </label>
        <button className="print-button" onClick={printReport}>
          تقرير الموجودين والعائدين PDF
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الفرع</th>
              <th>النوع</th>
              <th>البداية</th>
              <th>النهاية</th>
              <th>العودة</th>
              <th>الأيام</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id}>
                <td>
                  {x.employee_no}
                  <small>{x.employee_name}</small>
                </td>
                <td>{x.branch_name}</td>
                <td>{leaveLabel(x.leave_type)}</td>
                <td>{x.start_date}</td>
                <td>{x.end_date}</td>
                <td>{x.return_date}</td>
                <td>{x.days}</td>
                <td>{statusLabel(x.status)}</td>
                <td className="actions">
                  {x.status === "pending" && (
                    <>
                      <button
                        className="print-button"
                        onClick={() => decide(x.id, "approve")}
                      >
                        اعتماد
                      </button>
                      <button
                        className="danger"
                        onClick={() => decide(x.id, "reject")}
                      >
                        رفض
                      </button>
                    </>
                  )}
                  {isAdmin && <button className="danger" onClick={() => remove(x.id)}>
                    <Trash2 size={16} />
                  </button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>أرصدة الإجازات السنوية — {year}</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الفرع</th>
              <th>الرصيد</th>
              <th>المستخدم</th>
              <th>المتبقي</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((x) => (
              <tr key={x.employee_id}>
                <td>
                  {x.employee_no} - {x.employee_name}
                </td>
                <td>{x.branch_name}</td>
                <td>{x.entitlement}</td>
                <td>{x.used}</td>
                <td>
                  <strong>{x.remaining}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AuditPage({ token }: { token: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    void api("/api/v1/audit-logs?limit=300", token)
      .then(setItems)
      .catch((e) => setError(e.message));
  }, [token]);
  const labels: Record<string, string> = {
    create: "إضافة",
    update: "تعديل",
    delete: "حذف",
    excel_import: "استيراد Excel",
    approve: "اعتماد",
    reopen: "إعادة فتح",
  };
  return (
    <>
      <PageTitle
        title="سجل التدقيق"
        text="متابعة عمليات الإضافة والتعديل والحذف والاعتماد"
      />
      {error && <div className="error">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>التاريخ والوقت</th>
              <th>المستخدم</th>
              <th>العملية</th>
              <th>القسم</th>
              <th>التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id}>
                <td>{new Date(x.created_at).toLocaleString("ar-SA")}</td>
                <td>{x.username}</td>
                <td>{labels[x.action] || x.action}</td>
                <td>{x.entity}</td>
                <td>{x.details}</td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={5} className="no-data">
                  لا توجد عمليات مسجلة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function EmployeeChargesPage({ token, isAdmin }: { token: string; isAdmin: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [items, setItems] = useState<EmployeeCharge[]>([]);
  const [month, setMonth] = useState(currentMonth);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    employee_id: 0,
    branch_id: 0,
    charge_date: today,
    charge_type: "advance",
    amount: 0,
    deduction_start_month: currentMonth,
    installment_count: 1,
    funding_source: "branch",
    notes: "",
  });
  const chargeLabel = (type: string) =>
    type === "advance"
      ? "سلفة"
      : type === "order"
        ? "قيمة أوردر"
        : type === "penalty"
          ? "جزاء"
          : "مكافأة";
  const filteredEmployees = employees.filter((employee) => {
    const search = employeeSearch.trim().toLowerCase();
    return (
      !search ||
      employee.full_name_ar.toLowerCase().includes(search) ||
      employee.employee_no.toLowerCase().includes(search)
    );
  });
  const load = () =>
    api(`/api/v1/employee-charges?month=${month}`, token)
      .then(setItems)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void api("/api/v1/employees", token).then((data: Employee[]) => {
      setEmployees(data);
      if (data.length) setForm((x) => ({ ...x, employee_id: data[0].id }));
    });
    void api("/api/v1/branches", token).then((data: Branch[]) => {
      setBranches(data);
      if (data.length)
        setForm((x) => ({ ...x, branch_id: x.branch_id || data[0].id }));
    });
  }, [token]);
  useEffect(() => {
    void load();
  }, [token, month]);
  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = await api("/api/v1/employee-charges", token, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage(result.message);
      setMonth(form.deduction_start_month);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function remove(id: number) {
    if (!confirm("هل تريد حذف هذه الحركة؟")) return;
    try {
      await api(`/api/v1/employee-charges/${id}`, token, { method: "DELETE" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function printMonthlyReport(employeeId = form.employee_id) {
    if (!employeeId) return;
    try {
      const data = await api(
        `/api/v1/employees/${employeeId}/monthly-report?month=${month}`,
        token,
      );
      const p = window.open("", "_blank", "width=1100,height=800");
      if (!p) return;
      const e = (value: unknown) =>
        String(value ?? "—")
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;");
      const attendanceRows = data.attendance
        .map(
          (x: Attendance) =>
            `<tr><td>${e(x.work_date)}</td><td>${e(x.check_in)}</td><td>${e(x.check_out)}</td><td>${e(x.notes)}</td></tr>`,
        )
        .join("");
      const chargeRows = data.charges
        .map(
          (x: any) =>
            `<tr><td>${e(x.charge_date)}</td><td>${chargeLabel(x.charge_type)}</td><td>${x.charge_type === "advance" ? (x.funding_source === "treasury" ? "الخزنة" : x.funding_source === "bank" ? "تحويل بنكي" : "الفرع") : "—"}</td><td>${Number(x.amount).toLocaleString()}</td><td>${e(x.deduction_start_month)}</td><td>${x.installment_count}</td><td>${Number(x.month_amount).toLocaleString()}</td><td>${e(x.notes)}</td></tr>`,
        )
        .join("");
      const payroll = data.payroll;
      p.document.write(
        `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>تقرير ${e(data.employee.full_name_ar)} ${e(month)}</title><style>@page{size:A4;margin:10mm}body{font-family:Tahoma;font-size:11px;color:#172033}header{display:flex;justify-content:center;align-items:center;gap:18px;text-align:center}header img{width:80px}h1{margin:0}h2{font-size:15px;margin:18px 0 6px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #777;padding:5px;text-align:center}th{background:#eee}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.summary div{border:1px solid #777;padding:7px}.actions{text-align:center;margin:15px}@media print{.actions{display:none}}</style></head><body><header><img src="${location.origin}/tahina-logo.png"><div><h1>التقرير الشهري للموظف</h1><b>${e(data.employee.employee_no)} — ${e(data.employee.full_name_ar)} — ${e(data.employee.branch_name)} — ${e(month)}</b></div></header><h2>ملخص الراتب</h2>${payroll ? `<div class="summary"><div>الأساسي: ${payroll.basic_salary.toLocaleString()}</div><div>البدلات: ${payroll.allowances.toLocaleString()}</div><div>الإضافي: ${payroll.additions.toLocaleString()}</div><div>الغياب والخصومات: ${payroll.deductions.toLocaleString()}</div><div>السلف والأوردرات والجزاءات: ${payroll.daily_charges.toLocaleString()}</div><div>المكافآت: ${payroll.daily_rewards.toLocaleString()}</div><div>أيام العمل: ${payroll.work_days}</div><div><b>الصافي: ${payroll.net_salary.toLocaleString()} ر.س</b></div></div>` : "لا يوجد مسير راتب لهذا الشهر"}<h2>الحضور والانصراف</h2><table><thead><tr><th>التاريخ</th><th>الحضور</th><th>الانصراف</th><th>ملاحظات</th></tr></thead><tbody>${attendanceRows || '<tr><td colspan="4">لا توجد سجلات</td></tr>'}</tbody></table><h2>الحركات المالية اليومية</h2><table><thead><tr><th>التاريخ</th><th>النوع</th><th>المصدر</th><th>الإجمالي</th><th>بدء التطبيق</th><th>الأقساط</th><th>نصيب الشهر</th><th>ملاحظات</th></tr></thead><tbody>${chargeRows || '<tr><td colspan="8">لا توجد حركات</td></tr>'}</tbody></table><div class="actions"><button onclick="window.print()">طباعة أو حفظ PDF</button></div></body></html>`,
      );
      p.document.close();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <>
      <PageTitle
        title="الحركات المالية اليومية"
        text="السلف والأوردرات والجزاءات والمكافآت مع الترحيل أو التقسيط"
      />
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}
      <form className="crud-form employee-form" onSubmit={save}>
        <input
          type="search"
          placeholder="ابحث باسم الموظف أو الكود"
          value={employeeSearch}
          onChange={(e) => {
            const value = e.target.value;
            setEmployeeSearch(value);
            const normalized = value.trim().toLowerCase();
            const firstMatch = employees.find(
              (employee) =>
                !normalized ||
                employee.full_name_ar.toLowerCase().includes(normalized) ||
                employee.employee_no.toLowerCase().includes(normalized),
            );
            setForm({ ...form, employee_id: firstMatch?.id ?? 0 });
          }}
        />
        <select
          value={form.employee_id}
          onChange={(e) =>
            setForm({ ...form, employee_id: Number(e.target.value) })
          }
        >
          {filteredEmployees.map((x) => (
            <option key={x.id} value={x.id}>
              {x.employee_no} - {x.full_name_ar}
            </option>
          ))}
          {!filteredEmployees.length && (
            <option value="">لا يوجد موظف مطابق للبحث</option>
          )}
        </select>
        <select
          value={form.branch_id}
          onChange={(e) =>
            setForm({ ...form, branch_id: Number(e.target.value) })
          }
          required
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name_ar}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={form.charge_date}
          onChange={(e) => setForm({ ...form, charge_date: e.target.value })}
        />
        <select
          value={form.charge_type}
          onChange={(e) => setForm({ ...form, charge_type: e.target.value })}
        >
          <option value="advance">سلفة</option>
          <option value="order">قيمة أوردر</option>
          <option value="penalty">جزاء</option>
          <option value="reward">مكافأة</option>
        </select>
        <select
          value={form.funding_source}
          onChange={(e) => setForm({ ...form, funding_source: e.target.value })}
          disabled={form.charge_type !== "advance"}
        >
          <option value="branch">من الفرع</option>
          <option value="treasury">من الخزنة</option>
          <option value="bank">تحويل بنكي</option>
        </select>
        <input
          type="number"
          min="0.01"
          step="0.01"
          placeholder="القيمة"
          onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
        />
        <input
          type="month"
          title="شهر بدء الخصم أو الإضافة"
          value={form.deduction_start_month}
          onChange={(e) =>
            setForm({ ...form, deduction_start_month: e.target.value })
          }
        />
        <input
          type="number"
          min="1"
          max="60"
          placeholder="عدد الأقساط"
          value={form.installment_count}
          onChange={(e) =>
            setForm({ ...form, installment_count: Number(e.target.value) })
          }
        />
        <input
          placeholder="ملاحظات"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <button>تسجيل</button>
      </form>
      <div className="search">
        <label>
          شهر العرض:{" "}
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <button className="print-button" onClick={() => printMonthlyReport()}>
          تقرير الموظف الشهري PDF
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الفرع</th>
              <th>التاريخ</th>
              <th>النوع</th>
              <th>المصدر</th>
              <th>القيمة</th>
              <th>بدء التطبيق</th>
              <th>الأقساط</th>
              <th>نصيب الشهر</th>
              <th>ملاحظات</th>
              <th>تقرير</th>
              <th>حذف</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id}>
                <td>
                  {x.employee_no}
                  <small>{x.employee_name}</small>
                </td>
                <td>{x.branch_name}</td>
                <td>{x.charge_date}</td>
                <td>{chargeLabel(x.charge_type)}</td>
                <td>
                  {x.charge_type === "advance"
                    ? x.funding_source === "treasury"
                      ? "الخزنة"
                      : x.funding_source === "bank"
                        ? "تحويل بنكي"
                        : "الفرع"
                    : "—"}
                </td>
                <td>{x.amount.toLocaleString()}</td>
                <td>{x.deduction_start_month}</td>
                <td>{x.installment_count}</td>
                <td>{x.monthly_amount.toLocaleString()}</td>
                <td>{x.notes || "—"}</td>
                <td>
                  <button
                    className="print-button"
                    onClick={() => printMonthlyReport(x.employee_id)}
                  >
                    تقرير
                  </button>
                </td>
                <td>
                  {isAdmin && <button className="danger" onClick={() => remove(x.id)}>
                    <Trash2 size={17} />
                  </button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function PayrollPage({ token, isAdmin }: { token: string; isAdmin: boolean }) {
  const month = new Date().toISOString().slice(0, 7),
    blank = {
      employee_id: 0,
      branch_id: 0,
      payroll_month: month,
      work_days: 30,
      addition_days: 0,
      addition_amount: 0,
      deduction_days: 0,
      deduction_amount: 0,
      notes: "",
    };
  const [employees, setEmployees] = useState<Employee[]>([]),
    [branches, setBranches] = useState<Branch[]>([]),
    [items, setItems] = useState<Payroll[]>([]),
    [form, setForm] = useState(blank),
    [filter, setFilter] = useState(month),
    [printBranch, setPrintBranch] = useState(""),
    [periodStatus, setPeriodStatus] = useState({
      status: "open",
      approved_by: "",
      approved_at: null as string | null,
    }),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const load = () =>
    api(`/api/v1/payroll?payroll_month=${filter}`, token)
      .then(setItems)
      .catch((e) => setError(e.message));
  const loadStatus = () =>
    api(`/api/v1/payroll/status?payroll_month=${filter}`, token)
      .then(setPeriodStatus)
      .catch((e) => setError(e.message));
  useEffect(() => {
    void api("/api/v1/employees", token).then((x: Employee[]) => {
      setEmployees(x);
      if (x.length) setForm((f) => ({ ...f, employee_id: x[0].id }));
    });
    void api("/api/v1/branches", token).then((x: Branch[]) => {
      setBranches(x);
      if (x.length)
        setForm((f) => ({ ...f, branch_id: f.branch_id || x[0].id }));
    });
  }, [token]);
  useEffect(() => {
    void load();
    void loadStatus();
  }, [token, filter]);
  async function save(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/api/v1/payroll/manual", token, {
        method: "POST",
        body: JSON.stringify(form),
      });
      setMessage("تم حفظ مسير الموظف");
      setFilter(form.payroll_month);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  function editPayroll(item: Payroll) {
    const employee = employees.find(
      (candidate) => candidate.employee_no === item.employee_no,
    );
    if (!employee) {
      setError("تعذر العثور على الموظف لتحميل بياناته");
      return;
    }
    setForm({
      employee_id: employee.id,
      branch_id: item.branch_id,
      payroll_month: item.payroll_month,
      work_days: item.work_days,
      addition_days: item.addition_days,
      addition_amount: item.addition_amount,
      deduction_days: item.deduction_days,
      deduction_amount: item.deduction_amount,
      notes: item.notes,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
    setError("");
    setMessage("تم تحميل بيانات الموظف للتعديل؛ عدّل القيم ثم اضغط حفظ");
  }
  async function changePeriodStatus(action: "approve" | "reopen") {
    const question =
      action === "approve"
        ? "هل تريد اعتماد وإقفال مسير هذا الشهر؟ لن يمكن تعديله بعد الاعتماد."
        : "هل تريد إعادة فتح مسير هذا الشهر للتعديل؟";
    if (!window.confirm(question)) return;
    try {
      const result = await api(
        `/api/v1/payroll/${action}?payroll_month=${filter}`,
        token,
        { method: "POST" },
      );
      setMessage(result.message);
      setError("");
      await loadStatus();
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch(`${API_URL}/api/v1/payroll/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail);
      setMessage(
        `تم استيراد ${data.imported} وتحديث ${data.updated}، والأخطاء ${data.errors_total}`,
      );
      load();
    } catch (err) {
      setError((err as Error).message);
    }
    e.target.value = "";
  }
  async function exportExcel() {
    const response = await fetch(
      `${API_URL}/api/v1/payroll/export?payroll_month=${filter}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) {
      setError("تعذر تصدير المسير");
      return;
    }
    const blob = await response.blob(),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${filter}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }
  const money = (value: number) => value.toLocaleString("ar-SA") + " ر.س";
  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  function slipHtml(x: Payroll) {
    const e = escapeHtml;
    return `<section class="slip"><header><img src="${location.origin}/tahina-logo.png" alt="شعار طحينية"><div><h1>قسيمة راتب</h1><b>طحينية</b></div></header><div class="g"><div class="l">كود الموظف</div><div>${e(x.employee_no)}</div><div class="l">الشهر</div><div>${e(x.payroll_month)}</div><div class="l">اسم الموظف</div><div>${e(x.employee_name)}</div><div class="l">الوظيفة</div><div>${e(x.job_title)}</div><div class="l">الفرع</div><div>${e(x.branch_name)}</div><div class="l">أيام العمل</div><div>${x.work_days}</div><div class="l">الأساسي</div><div>${money(x.basic_salary)}</div><div class="l">البدلات</div><div>${money(x.allowances)}</div><div class="l">أيام الإضافي</div><div>${x.addition_days}</div><div class="l">إجمالي الإضافي</div><div>${money(x.additions)}</div><div class="l">المكافآت</div><div>${money(x.applied_daily_rewards)}</div><div class="l">أيام الغياب</div><div>${x.deduction_days}</div><div class="l">خصم الغياب</div><div>${money(x.deduction_days * x.day_value)}</div><div class="l">خصومات مالية</div><div>${money(x.deduction_amount)}</div><div class="l">السلف والأوردرات والجزاءات</div><div>${money(x.applied_daily_charges)}</div><div class="l">إجمالي الخصم</div><div>${money(x.deductions + x.applied_daily_charges)}</div><div class="l">صافي الراتب</div><div class="n">${money(x.net_salary)}</div><div class="l">ملاحظات</div><div>${e(x.notes || "—")}</div></div></section>`;
  }
  function printDocument(title: string, slips: Payroll[]) {
    const p = window.open("", "_blank", "width=900,height=650");
    if (!p) return;
    p.document.write(
      `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{size:A4;margin:12mm}*{box-sizing:border-box}body{font-family:Tahoma;color:#172033;margin:0}.slip{page-break-after:always;break-after:page;min-height:260mm;padding:8px}.slip:last-of-type{page-break-after:auto;break-after:auto}header{display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:18px;text-align:center}header img{width:115px;height:90px;object-fit:contain}h1{margin:0 0 6px}.g{display:grid;grid-template-columns:repeat(4,1fr);border:2px solid #222}.g div{padding:11px;border:1px solid #aaa}.l{font-weight:bold;background:#eee}.n{font-size:21px;font-weight:bold;color:#d95700}.actions{text-align:center;margin:18px}button{padding:10px 28px}@media print{.actions{display:none}}</style></head><body>${slips.map(slipHtml).join("")}<div class="actions"><button onclick="window.print()">طباعة</button></div></body></html>`,
    );
    p.document.close();
  }
  function printSlip(x: Payroll) {
    printDocument(`قسيمة ${x.employee_no}`, [x]);
  }
  function compactSlipHtml(x: Payroll) {
    const e = escapeHtml;
    return `<article class="mini"><div class="mini-title"><b>قسيمة راتب — ${e(x.employee_no)} — ${e(x.employee_name)}</b><span>${e(x.payroll_month)}</span></div><div class="mini-grid"><span><b>الفرع:</b> ${e(x.branch_name)}</span><span><b>أيام العمل:</b> ${x.work_days}</span><span><b>الأساسي:</b> ${money(x.basic_salary)}</span><span><b>البدلات:</b> ${money(x.allowances)}</span><span><b>الإضافي:</b> ${money(x.additions)}</span><span><b>الغياب:</b> ${x.deduction_days} يوم</span><span><b>خصومات:</b> ${money(x.deductions)}</span><span><b>سلف/أوردرات:</b> ${money(x.applied_daily_charges)}</span><span class="net"><b>الصافي:</b> ${money(x.net_salary)}</span><span><b>ملاحظات:</b> ${e(x.notes || "—")}</span></div></article>`;
  }
  function printCompactBranch(title: string, slips: Payroll[]) {
    const p = window.open("", "_blank", "width=1000,height=750");
    if (!p) return;
    const pages: Payroll[][] = [];
    for (let i = 0; i < slips.length; i += 10)
      pages.push(slips.slice(i, i + 10));
    const pageHtml = pages
      .map(
        (page, index) =>
          `<section class="page"><header><img src="${location.origin}/tahina-logo.png" alt="شعار طحينية"><div><h2>قسائم رواتب فرع ${escapeHtml(printBranch)}</h2><span>الشهر: ${escapeHtml(filter)} — صفحة ${index + 1} من ${pages.length}</span></div></header>${page.map(compactSlipHtml).join("")}</section>`,
      )
      .join("");
    p.document.write(
      `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>@page{size:A4 portrait;margin:6mm}*{box-sizing:border-box}body{font-family:Tahoma,Arial;color:#111;margin:0;font-size:9px}.page{height:285mm;page-break-after:always;break-after:page;overflow:hidden}.page:last-of-type{page-break-after:auto;break-after:auto}header{height:17mm;display:flex;align-items:center;justify-content:center;gap:12px;border-bottom:1px solid #777;margin-bottom:2mm}header img{width:42px;height:38px;object-fit:contain}h2{font-size:15px;margin:0 0 2px}.mini{height:26.2mm;border:1px solid #333;margin-bottom:1mm;break-inside:avoid;overflow:hidden}.mini-title{display:flex;justify-content:space-between;align-items:center;background:#eee;border-bottom:1px solid #777;padding:2px 5px;font-size:10px}.mini-grid{display:grid;grid-template-columns:repeat(5,1fr);height:calc(100% - 18px)}.mini-grid span{padding:3px 4px;border-left:1px solid #bbb;border-bottom:1px solid #bbb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mini-grid .net{font-size:11px;color:#b34700}.actions{text-align:center;margin:15px}button{padding:10px 28px}@media print{.actions{display:none}}</style></head><body>${pageHtml}<div class="actions"><button onclick="window.print()">طباعة</button></div></body></html>`,
    );
    p.document.close();
  }
  function printBranchSlips() {
    const selected = items.filter((x) => x.branch_name === printBranch);
    if (!printBranch || !selected.length) {
      setError("اختر فرعًا يحتوي على موظفين في مسير الشهر");
      return;
    }
    setError("");
    printCompactBranch(`قسائم فرع ${printBranch} - ${filter}`, selected);
  }
  function exportBranchPdf() {
    const selected = items.filter((x) => x.branch_name === printBranch);
    if (!printBranch || !selected.length) {
      setError("اختر فرعًا يحتوي على موظفين في مسير الشهر");
      return;
    }
    setError("");
    const p = window.open("", "_blank", "width=1200,height=800");
    if (!p) return;
    const total = (field: keyof Payroll) =>
      selected.reduce((sum, row) => sum + Number(row[field] || 0), 0);
    const rows = selected
      .map(
        (x) =>
          `<tr><td>${escapeHtml(x.employee_no)}</td><td>${escapeHtml(x.employee_name)}</td><td>${escapeHtml(x.job_title)}</td><td>${x.work_days}</td><td>${money(x.basic_salary)}</td><td>${money(x.allowances)}</td><td>${x.addition_days}</td><td>${money(x.additions)}</td><td>${x.deduction_days}</td><td>${money(x.deduction_days * x.day_value)}</td><td>${money(x.deduction_amount)}</td><td>${money(x.daily_charges)}</td><td>${money(x.applied_daily_charges)}</td><td>${money(x.net_salary)}</td><td>${escapeHtml(x.notes || "—")}</td></tr>`,
      )
      .join("");
    p.document.write(
      `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><title>مسير رواتب ${escapeHtml(printBranch)} ${escapeHtml(filter)}</title><style>@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font-family:Tahoma,Arial;color:#111;margin:0;font-size:8px}header{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:8px}header img{width:62px;height:52px;object-fit:contain}h1{font-size:18px;margin:0 0 4px;text-align:center}table{width:100%;border-collapse:collapse}th,td{border:1px solid #555;padding:4px 2px;text-align:center}th,tfoot td{background:#eee;font-weight:bold}tr{break-inside:avoid}.actions{text-align:center;margin:14px}.actions button{padding:10px 25px;font-size:14px}@media print{.actions{display:none}}</style></head><body><header><img src="${location.origin}/tahina-logo.png" alt="شعار طحينية"><div><h1>مسير رواتب الفرع: ${escapeHtml(printBranch)}</h1><b>شهر ${escapeHtml(filter)} — عدد الموظفين ${selected.length}</b></div></header><table><thead><tr><th>الكود</th><th>اسم الموظف</th><th>الوظيفة</th><th>أيام العمل</th><th>الأساسي</th><th>البدلات</th><th>أيام الإضافي</th><th>الإضافي</th><th>أيام الغياب</th><th>خصم الغياب</th><th>خصومات مالية</th><th>سلف/أوردرات مستحقة</th><th>المخصوم منها</th><th>الصافي</th><th>ملاحظات</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="3">الإجمالي</td><td>${total("work_days")}</td><td>${money(total("basic_salary"))}</td><td>${money(total("allowances"))}</td><td>${total("addition_days")}</td><td>${money(total("additions"))}</td><td>${total("deduction_days")}</td><td>${money(selected.reduce((sum, x) => sum + x.deduction_days * x.day_value, 0))}</td><td>${money(total("deduction_amount"))}</td><td>${money(total("daily_charges"))}</td><td>${money(total("applied_daily_charges"))}</td><td>${money(total("net_salary"))}</td><td>—</td></tr></tfoot></table><div class="actions"><button onclick="window.print()">حفظ أو طباعة PDF</button><p>اختر Microsoft Print to PDF أو Save as PDF من نافذة الطباعة.</p></div></body></html>`,
    );
    p.document.close();
  }
  const payrollBranches = [...new Set(items.map((x) => x.branch_name))].sort();
  return (
    <>
      <PageTitle
        title="مسير الرواتب"
        text="قيمة اليوم = الأساسي ÷ 30، ويوم الإضافي بقيمة يوم عادي"
      />
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}
      <div className={periodStatus.status === "approved" ? "success" : "error"}>
        حالة شهر {filter}:{" "}
        {periodStatus.status === "approved" ? "معتمد ومغلق" : "مفتوح للتعديل"}
        {periodStatus.approved_by && ` — اعتمده ${periodStatus.approved_by}`}
      </div>
      <div className="attendance-tools">
        <a className="template" href="/payroll-template.xlsx" download>
          <Download size={18} />
          تحميل قالب الرواتب
        </a>
        <label className="upload">
          <Upload size={18} />
          استيراد المسير من Excel
          <input
            type="file"
            accept=".xlsx"
            disabled={periodStatus.status === "approved"}
            onChange={uploadFile}
          />
        </label>
        <button className="template export-button" onClick={exportExcel}>
          <Download size={18} />
          تصدير المسير Excel
        </button>
        <select
          className="template"
          value={printBranch}
          onChange={(e) => setPrintBranch(e.target.value)}
        >
          <option value="">اختر الفرع للطباعة</option>
          {payrollBranches.map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
        <button className="template export-button" onClick={printBranchSlips}>
          طباعة قسائم الفرع
        </button>
        <button className="template export-button" onClick={exportBranchPdf}>
          تصدير مسير الفرع PDF
        </button>
        {periodStatus.status !== "approved" ? (
          <button
            className="template export-button"
            onClick={() => changePeriodStatus("approve")}
          >
            اعتماد وإقفال الشهر
          </button>
        ) : isAdmin ? (
          <button
            className="template export-button"
            onClick={() => changePeriodStatus("reopen")}
          >
            فتح الشهر للتعديل
          </button>
        ) : null}
      </div>
      <form className="crud-form employee-form" onSubmit={save}>
        <select
          value={form.employee_id}
          onChange={(e) =>
            setForm({ ...form, employee_id: Number(e.target.value) })
          }
        >
          {employees.map((x) => (
            <option key={x.id} value={x.id}>
              {x.employee_no} - {x.full_name_ar}
            </option>
          ))}
        </select>
        <select
          value={form.branch_id}
          onChange={(e) =>
            setForm({ ...form, branch_id: Number(e.target.value) })
          }
          required
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name_ar}
            </option>
          ))}
        </select>
        <input
          type="month"
          value={form.payroll_month}
          onChange={(e) => setForm({ ...form, payroll_month: e.target.value })}
        />
        <input
          type="number"
          min="0"
          step="0.5"
          placeholder="أيام العمل"
          value={form.work_days}
          onChange={(e) =>
            setForm({ ...form, work_days: Number(e.target.value) })
          }
        />
        <input
          type="number"
          min="0"
          step="0.5"
          placeholder="أيام الإضافي"
          value={form.addition_days || ""}
          onChange={(e) =>
            setForm({ ...form, addition_days: Number(e.target.value) })
          }
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="مبلغ الإضافي"
          value={form.addition_amount || ""}
          onChange={(e) =>
            setForm({ ...form, addition_amount: Number(e.target.value) })
          }
        />
        <input
          type="number"
          min="0"
          step="0.5"
          placeholder="أيام الغياب"
          value={form.deduction_days || ""}
          onChange={(e) =>
            setForm({ ...form, deduction_days: Number(e.target.value) })
          }
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="الخصومات المالية"
          value={form.deduction_amount || ""}
          onChange={(e) =>
            setForm({ ...form, deduction_amount: Number(e.target.value) })
          }
        />
        <input
          placeholder="ملاحظات"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <button disabled={periodStatus.status === "approved"}>حفظ</button>
      </form>
      <div className="search">
        <label>
          شهر المسير:{" "}
          <input
            type="month"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </label>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الفرع</th>
              <th>أيام العمل</th>
              <th>الأساسي</th>
              <th>البدلات</th>
              <th>الإضافي</th>
              <th>الغياب</th>
              <th>الخصومات</th>
              <th>سلف وأوردرات</th>
              <th>مكافآت</th>
              <th>الصافي</th>
              <th>تعديل</th>
              <th>طباعة</th>
            </tr>
          </thead>
          <tbody>
            {items.map((x) => (
              <tr key={x.id}>
                <td>
                  {x.employee_no}
                  <small>{x.employee_name}</small>
                </td>
                <td>{x.branch_name}</td>
                <td>{x.work_days}</td>
                <td>{x.basic_salary.toLocaleString()}</td>
                <td>{x.allowances.toLocaleString()}</td>
                <td>
                  {x.additions.toLocaleString()}
                  <small>
                    {x.addition_days} يوم + {x.addition_amount}
                  </small>
                </td>
                <td>
                  {x.deduction_days + x.leave_deduction_days} يوم
                  <small>
                    {(
                      (x.deduction_days + x.leave_deduction_days) *
                      x.day_value
                    ).toLocaleString()}{" "}
                    ر.س
                  </small>
                </td>
                <td>{x.deduction_amount.toLocaleString()}</td>
                <td>
                  {x.daily_charges.toLocaleString()}
                  <small>
                    {periodStatus.status === "approved"
                      ? "تم الخصم"
                      : "قيد المراجعة"}
                  </small>
                </td>
                <td>
                  {x.daily_rewards.toLocaleString()}
                  <small>
                    {periodStatus.status === "approved"
                      ? "تمت الإضافة"
                      : "قيد المراجعة"}
                  </small>
                </td>
                <td>
                  <strong>{x.net_salary.toLocaleString()} ر.س</strong>
                </td>
                <td>
                  {isAdmin && <button
                    className="print-button"
                    disabled={periodStatus.status === "approved"}
                    onClick={() => editPayroll(x)}
                  >
                    تعديل
                  </button>}
                </td>
                <td>
                  <button className="print-button" onClick={() => printSlip(x)}>
                    قسيمة
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={13} className="no-data">
                  لا يوجد مسير لهذا الشهر
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function UsersPage({ token }: { token: string }) {
  const blank = { username: "", full_name: "", password: "", role: "hr_manager", is_active: true };
  const [items, setItems] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = () => api("/api/v1/users", token).then(setItems).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, [token]);
  async function save(e: FormEvent) {
    e.preventDefault(); setError(""); setMessage("");
    try {
      await api(editing ? `/api/v1/users/${editing}` : "/api/v1/users", token, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(editing ? { full_name: form.full_name, password: form.password, role: form.role, is_active: form.is_active } : form),
      });
      setMessage(editing ? "تم تعديل المستخدم" : "تم إنشاء المستخدم");
      setForm(blank); setEditing(null); await load();
    } catch (err) { setError((err as Error).message); }
  }
  function edit(item: ManagedUser) {
    setEditing(item.id);
    setForm({ username: item.username, full_name: item.full_name, password: "", role: item.role, is_active: item.is_active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function remove(id: number) {
    if (!confirm("هل تريد حذف هذا المستخدم؟")) return;
    try { await api(`/api/v1/users/${id}`, token, { method: "DELETE" }); await load(); }
    catch (err) { setError((err as Error).message); }
  }
  return <>
    <PageTitle title="المستخدمون والصلاحيات" text="مدير النظام كامل الصلاحيات، ومسؤول الموارد البشرية بلا تعديل أو حذف" />
    {message && <div className="success">{message}</div>}{error && <div className="error">{error}</div>}
    <form className="form-card" onSubmit={save}>
      <input required disabled={editing !== null} placeholder="اسم المستخدم" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
      <input required placeholder="الاسم بالكامل" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      <input required={!editing} type="password" placeholder={editing ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور (8 أحرف فأكثر)"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
        <option value="system_admin">مدير النظام — كامل الصلاحيات</option>
        <option value="hr_manager">مسؤول الموارد البشرية — بدون تعديل أو حذف</option>
      </select>
      <label><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> حساب نشط</label>
      <button>{editing ? "حفظ التعديل" : "إضافة المستخدم"}</button>
      {editing && <button type="button" onClick={() => { setEditing(null); setForm(blank); }}>إلغاء</button>}
    </form>
    <div className="table-wrap"><table><thead><tr><th>اسم المستخدم</th><th>الاسم</th><th>الصلاحية</th><th>الحالة</th><th>إجراءات</th></tr></thead>
      <tbody>{items.map((x) => <tr key={x.id}><td>{x.username}</td><td>{x.full_name}</td><td>{x.role_label}</td><td>{x.is_active ? "نشط" : "موقوف"}</td><td><button onClick={() => edit(x)}><Pencil size={17} /></button> <button className="danger" onClick={() => remove(x.id)}><Trash2 size={17} /></button></td></tr>)}</tbody>
    </table></div>
  </>;
}
export function App() { 
  const [token, setToken] = useState(
    () => localStorage.getItem("tahina_token") ?? "",
  );
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("tahina_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState<Page>("dashboard");
  function login(newToken: string, newUser: User) {
    localStorage.setItem("tahina_token", newToken);
    localStorage.setItem("tahina_user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }
  function logout() {
    localStorage.removeItem("tahina_token");
    localStorage.removeItem("tahina_user");
    setToken("");
    setUser(null);
    setData(null);
  }
  const refreshDashboard = () => {
    if (token)
      void api("/api/v1/dashboard", token)
        .then(setData)
        .catch((e) => {
          if (e.message.includes("الدخول")) logout();
          setError(e.message);
        });
  };
  useEffect(() => {
    refreshDashboard();
  }, [token]);
  if (!token || !user) return <Login onLogin={login} />;
  const cards = [
    ["إجمالي الموظفين", data?.employees_total ?? "—", Users],
    ["عدد الفروع", data?.branches_total ?? "—", Building2],
    ["الحاضرون اليوم", data?.employees_present_today ?? "—", ShieldCheck],
    ["الغائبون اليوم", data?.employees_absent_today ?? "—", CalendarClock],
    ["عقود قاربت على الانتهاء", data?.contracts_expiring ?? "—", FileWarning],
    ["إقامات قاربت على الانتهاء", data?.iqamas_expiring ?? "—", FileWarning],
  ] as const;
  return (
    <div className="app" dir="rtl">
      <aside>
        <div className="brand">
          <b>ط</b>
          <span>
            Tahina HRMS
            <br />
            <small>Enterprise</small>
          </span>
        </div>
        <nav>
          <a
            className={page === "dashboard" ? "active" : ""}
            onClick={() => setPage("dashboard")}
          >
            <LayoutDashboard size={20} />
            لوحة التحكم
          </a>
          <a
            className={page === "employees" ? "active" : ""}
            onClick={() => setPage("employees")}
          >
            <Users size={20} />
            الموظفون
          </a>
          <a
            className={page === "branches" ? "active" : ""}
            onClick={() => setPage("branches")}
          >
            <Building2 size={20} />
            الفروع
          </a>
          <a
            className={page === "attendance" ? "active" : ""}
            onClick={() => setPage("attendance")}
          >
            <CalendarClock size={20} />
            الحضور والانصراف
          </a>
          <a
            className={page === "leaves" ? "active" : ""}
            onClick={() => setPage("leaves")}
          >
            <CalendarClock size={20} />
            الإجازات والأرصدة
          </a>
          <a
            className={page === "documents" ? "active" : ""}
            onClick={() => setPage("documents")}
          >
            <FileWarning size={20} />
            العقود والإقامات
          </a>
          <a
            className={page === "payroll" ? "active" : ""}
                        onClick={() => setPage("payroll")}
          >
            <WalletCards size={20} />
            مسير الرواتب
          </a>
          <a
            className={page === "charges" ? "active" : ""}
            onClick={() => setPage("charges")}
          >
            <WalletCards size={20} />
            الحركات المالية اليومية
          </a>
          {user.role === "system_admin" && (
            <a className={page === "users" ? "active" : ""} onClick={() => setPage("users")}>
              <UserCog size={20} /> المستخدمون والصلاحيات
            </a>
          )}
          {user.role === "system_admin" && (
            <a className={page === "audit" ? "active" : ""} onClick={() => setPage("audit")}>
              <ShieldCheck size={20} /> سجل التدقيق
            </a>
          )}
         <a
  className={page === "reports" ? "active" : ""}
  onClick={() => setPage("reports")}
>
  <span style={{ fontSize: 20 }}>📊</span>
  التقارير
</a> 
        </nav>
      </aside>
      <main>
        <header>
          <div></div>
          <div className="account">
            <div className="user">
              <span>{user.full_name[0]}</span>
              <div>
                {user.full_name}
                <small>{user.role_label}</small>
              </div>
            </div>
            <button onClick={logout} title="تسجيل الخروج">
              <LogOut size={19} />
            </button>
          </div>
        </header>
        {error && <div className="error">{error}</div>}
        {page === "dashboard" && (
          <>
            <PageTitle
              title="لوحة التحكم"
              text="نظرة عامة على الموارد البشرية في جميع الفروع"
            />
            <section className="cards">
              {cards.map(([label, value, Icon]) => (
                <article key={label}>
                  <div className="icon">
                    <Icon size={24} />
                  </div>
                  <div>
                    <small>{label}</small>
                    <strong>{value}</strong>
                  </div>
                </article>
              ))}
            </section>
            <section className="panels">
              <article className="panel">
                <h2>حالة النظام</h2>
                <div className="empty">
                  <ShieldCheck size={46} />
                  <h3>إدارة الموظفين والفروع جاهزة</h3>
                  <p>الحساب الحالي: {user.role_label}</p>
                </div>
              </article>
              <article className="panel">
                <h2>الخطوات القادمة</h2>
                <ol>
                  <li>العقود والوثائق</li>
                  <li>الحضور والانصراف</li>
                  <li>الرواتب</li>
                </ol>
              </article>
            </section>
          </>
        )}
        {page === "branches" && (
          <Branches
            token={token}
            isAdmin={user.role === "system_admin"}
            onChanged={refreshDashboard}
          />
        )}{" "}
        {page === "employees" && (
          <Employees token={token} isAdmin={user.role === "system_admin"} onChanged={refreshDashboard} />
        )}{" "}
        {page === "attendance" && <AttendancePage token={token} isAdmin={user.role === "system_admin"} />}{" "}
        {page === "leaves" && <LeavesPage token={token} isAdmin={user.role === "system_admin"} />}{" "}
        {page === "documents" && <DocumentsPage token={token} isAdmin={user.role === "system_admin"} />}{" "}
        {page === "charges" && <EmployeeChargesPage token={token} isAdmin={user.role === "system_admin"} />}{" "}
        {page === "users" && <UsersPage token={token} />}{" "}
        {page === "audit" && <AuditPage token={token} />}{" "}
        {page === "payroll" && (
          <PayrollPage token={token} isAdmin={user.role === "system_admin"} />
        )}
        {page === "reports" && <ReportsPage token={token} onOpenPage={(targetPage) => setPage(targetPage as Page)} />}
      </main>
    </div>
  );
  }
