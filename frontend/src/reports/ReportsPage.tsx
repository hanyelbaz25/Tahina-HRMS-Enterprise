import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Download,
  FileSpreadsheet,
  FileText,
  Gift,
  Printer,
  Scale,
  Search,
  Users,
  WalletCards,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type ReportCategory = "employees" | "time" | "finance" | "documents";

type ReportItem = {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  targetPage: string;
  endpoint: string;
  Icon: typeof Users;
  filter?: (row: Record<string, unknown>) => boolean;
};

type ReportsPageProps = {
  token: string;
  onOpenPage: (page: string) => void;
};

const categoryLabels: Record<ReportCategory | "all", string> = {
  all: "الكل",
  employees: "الموظفون",
  time: "الدوام والإجازات",
  finance: "المالية والرواتب",
  documents: "العقود والوثائق",
};

const reports: ReportItem[] = [
  {
    id: "employees",
    title: "تقرير الموظفين",
    description: "بيانات الموظفين وحالتهم الوظيفية والفروع والوظائف.",
    category: "employees",
    targetPage: "employees",
    endpoint: "/api/v1/employees",
    Icon: Users,
  },
  {
    id: "attendance",
    title: "تقرير الحضور والانصراف",
    description: "سجلات الحضور والانصراف ومصدر التسجيل والملاحظات.",
    category: "time",
    targetPage: "attendance",
    endpoint: "/api/v1/attendance",
    Icon: Clock3,
  },
  {
    id: "leaves",
    title: "تقرير الإجازات",
    description: "طلبات الإجازات الحالية والسابقة وحالات الاعتماد.",
    category: "time",
    targetPage: "leaves",
    endpoint: "/api/v1/leaves",
    Icon: CalendarDays,
  },
  {
    id: "loans",
    title: "تقرير السلف",
    description: "السلف المسجلة وقيمة القسط ومصدر الصرف وبداية الخصم.",
    category: "finance",
    targetPage: "charges",
    endpoint: "/api/v1/employee-charges",
    Icon: WalletCards,
    filter: (row) => row.charge_type === "advance",
  },
  {
    id: "orders",
    title: "تقرير الأوامر المالية",
    description: "الأوامر والحركات المالية المسجلة على الموظفين.",
    category: "finance",
    targetPage: "charges",
    endpoint: "/api/v1/employee-charges",
    Icon: BadgeDollarSign,
    filter: (row) => row.charge_type === "order",
  },
  {
    id: "penalties",
    title: "تقرير الجزاءات",
    description: "الجزاءات والخصومات وتاريخ تطبيق كل حركة.",
    category: "finance",
    targetPage: "charges",
    endpoint: "/api/v1/employee-charges",
    Icon: Scale,
    filter: (row) => row.charge_type === "penalty",
  },
  {
    id: "rewards",
    title: "تقرير المكافآت",
    description: "المكافآت والحوافز المسجلة للموظفين.",
    category: "finance",
    targetPage: "charges",
    endpoint: "/api/v1/employee-charges",
    Icon: Gift,
    filter: (row) => row.charge_type === "reward",
  },
  {
    id: "payroll",
    title: "تقرير الرواتب",
    description: "مسيرات الرواتب والاستحقاقات والاستقطاعات وصافي الراتب.",
    category: "finance",
    targetPage: "payroll",
    endpoint: "/api/v1/payroll",
    Icon: FileSpreadsheet,
  },
  {
    id: "contracts",
    title: "تقرير العقود والوثائق",
    description: "العقود والإقامات والوثائق وتواريخ الانتهاء.",
    category: "documents",
    targetPage: "documents",
    endpoint: "/api/v1/documents",
    Icon: BriefcaseBusiness,
  },
];

function valueToText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeCsv(value: unknown) {
  return `"${valueToText(value).replaceAll('"', '""')}"`;
}

export default function ReportsPage({ token, onOpenPage }: ReportsPageProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ReportCategory | "all">("all");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState("");

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesCategory = category === "all" || report.category === category;
      const matchesQuery =
        !normalizedQuery ||
        `${report.title} ${report.description}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  async function loadRows(report: ReportItem) {
    const response = await fetch(`${API_URL}${report.endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail ?? "تعذر تحميل بيانات التقرير");
    const rows = Array.isArray(result) ? result : result.items ?? [];
    return report.filter ? rows.filter(report.filter) : rows;
  }

  useEffect(() => {
    let active = true;
    async function loadCounts() {
      const next: Record<string, number> = {};
      for (const report of reports) {
        try {
          const rows = await loadRows(report);
          next[report.id] = rows.length;
        } catch {
          next[report.id] = 0;
        }
      }
      if (active) setCounts(next);
    }
    void loadCounts();
    return () => {
      active = false;
    };
  }, [token]);

  async function exportCsv(report: ReportItem) {
    setLoadingId(report.id);
    setError("");
    try {
      const rows = await loadRows(report);
      if (!rows.length) throw new Error("لا توجد بيانات متاحة لتصدير هذا التقرير");
      const columns: string[] = Array.from(new Set<string>(rows.flatMap((row: Record<string, unknown>) => Object.keys(row))));
      const csv = [
        columns.map(escapeCsv).join(","),
        ...rows.map((row: Record<string, unknown>) => columns.map((column) => escapeCsv(row[column])).join(",")),
      ].join("\n");
      const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.id}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تصدير التقرير");
    } finally {
      setLoadingId("");
    }
  }

  return (
    <>
      <div className="page-title reports-heading">
        <div>
          <h1>مركز التقارير</h1>
          <p>عرض تقارير الموارد البشرية وفتح مصدر البيانات أو تصديره من مكان واحد.</p>
        </div>
        <button type="button" className="reports-print" onClick={() => window.print()}>
          <Printer size={18} /> طباعة الصفحة
        </button>
      </div>

      <section className="reports-summary">
        <article><FileText size={22} /><div><strong>{reports.length}</strong><span>تقارير متاحة</span></div></article>
        <article><Users size={22} /><div><strong>{counts.employees ?? "—"}</strong><span>موظف مسجل</span></div></article>
        <article><CalendarDays size={22} /><div><strong>{counts.leaves ?? "—"}</strong><span>سجل إجازة</span></div></article>
        <article><WalletCards size={22} /><div><strong>{counts.payroll ?? "—"}</strong><span>سجل رواتب</span></div></article>
      </section>

      <div className="reports-controls">
        <div className="reports-toolbar">
          <Search size={20} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن تقرير..."
            aria-label="البحث في التقارير"
          />
        </div>
        <div className="report-categories" aria-label="تصنيف التقارير">
          {(Object.keys(categoryLabels) as Array<ReportCategory | "all">).map((key) => (
            <button
              type="button"
              key={key}
              className={category === key ? "active" : ""}
              onClick={() => setCategory(key)}
            >
              {categoryLabels[key]}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <section className="reports-grid">
        {filteredReports.map((report) => {
          const Icon = report.Icon;
          return (
            <article className="report-card" key={report.id}>
              <div className="report-card-top">
                <span className="report-icon"><Icon size={23} /></span>
                <span className="report-count">{counts[report.id] ?? "—"} سجل</span>
              </div>
              <div>
                <h3>{report.title}</h3>
                <p>{report.description}</p>
              </div>
              <div className="report-actions">
                <button type="button" className="report-open" onClick={() => onOpenPage(report.targetPage)}>
                  فتح البيانات <ArrowLeft size={17} />
                </button>
                <button
                  type="button"
                  className="report-export"
                  disabled={loadingId === report.id}
                  onClick={() => void exportCsv(report)}
                  title="تصدير بصيغة CSV المتوافقة مع Excel"
                >
                  <Download size={17} /> {loadingId === report.id ? "جارٍ..." : "Excel"}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      {filteredReports.length === 0 && (
        <div className="empty">
          <Search size={42} />
          <h3>لا توجد تقارير مطابقة</h3>
          <p>جرّب كلمة بحث أو تصنيفًا آخر.</p>
        </div>
      )}
    </>
  );
}
