import { useEffect, useMemo, useRef, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  FileText,
  Gift,
  Printer,
  Scale,
  Search,
  Users,
  WalletCards,
  X,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type ReportCategory = "employees" | "time" | "finance" | "documents";
type Row = Record<string, unknown>;

type EmployeeOption = {
  id: string;
  code: string;
  name: string;
  raw: Row;
};

type ReportItem = {
  id: string;
  title: string;
  description: string;
  category: ReportCategory;
  targetPage: string;
  endpoint: string;
  Icon: typeof Users;
  filter?: (row: Row) => boolean;
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

const columnLabels: Record<string, string> = {
  id: "الرقم",
  employee_id: "رقم الموظف",
  employee_code: "كود الموظف",
  employee_name: "اسم الموظف",
  full_name: "اسم الموظف",
  name: "الاسم",
  branch: "الفرع",
  branch_name: "الفرع",
  department: "القسم",
  department_name: "القسم",
  job_title: "المسمى الوظيفي",
  position: "الوظيفة",
  status: "الحالة",
  date: "التاريخ",
  attendance_date: "تاريخ الحضور",
  check_in: "وقت الحضور",
  check_out: "وقت الانصراف",
  start_date: "تاريخ البداية",
  end_date: "تاريخ النهاية",
  amount: "المبلغ",
  net_salary: "صافي الراتب",
  basic_salary: "الراتب الأساسي",
  charge_type: "نوع الحركة",
  notes: "ملاحظات",
  created_at: "تاريخ الإنشاء",
  updated_at: "تاريخ التحديث",
};

const reports: ReportItem[] = [
  { id: "employees", title: "تقرير الموظفين", description: "بيانات الموظفين وحالتهم الوظيفية والفروع والوظائف.", category: "employees", targetPage: "employees", endpoint: "/api/v1/employees", Icon: Users },
  { id: "attendance", title: "تقرير الحضور والانصراف", description: "سجلات الحضور والانصراف ومصدر التسجيل والملاحظات.", category: "time", targetPage: "attendance", endpoint: "/api/v1/attendance", Icon: Clock3 },
  { id: "leaves", title: "تقرير الإجازات", description: "طلبات الإجازات الحالية والسابقة وحالات الاعتماد.", category: "time", targetPage: "leaves", endpoint: "/api/v1/leaves", Icon: CalendarDays },
  { id: "loans", title: "تقرير السلف", description: "السلف المسجلة وقيمة القسط ومصدر الصرف وبداية الخصم.", category: "finance", targetPage: "charges", endpoint: "/api/v1/employee-charges", Icon: WalletCards, filter: (row) => row.charge_type === "advance" },
  { id: "orders", title: "تقرير الأوامر المالية", description: "الأوامر والحركات المالية المسجلة على الموظفين.", category: "finance", targetPage: "charges", endpoint: "/api/v1/employee-charges", Icon: BadgeDollarSign, filter: (row) => row.charge_type === "order" },
  { id: "penalties", title: "تقرير الجزاءات", description: "الجزاءات والخصومات وتاريخ تطبيق كل حركة.", category: "finance", targetPage: "charges", endpoint: "/api/v1/employee-charges", Icon: Scale, filter: (row) => row.charge_type === "penalty" },
  { id: "rewards", title: "تقرير المكافآت", description: "المكافآت والحوافز المسجلة للموظفين.", category: "finance", targetPage: "charges", endpoint: "/api/v1/employee-charges", Icon: Gift, filter: (row) => row.charge_type === "reward" },
  { id: "payroll", title: "تقرير الرواتب", description: "مسيرات الرواتب والاستحقاقات والاستقطاعات وصافي الراتب.", category: "finance", targetPage: "payroll", endpoint: "/api/v1/payroll", Icon: FileSpreadsheet },
  { id: "contracts", title: "تقرير العقود والوثائق", description: "العقود والإقامات والوثائق وتواريخ الانتهاء.", category: "documents", targetPage: "documents", endpoint: "/api/v1/documents", Icon: BriefcaseBusiness },
];

function valueToText(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-");
}

function getColumns(rows: Row[]) {
  return Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
}

function firstText(row: Row, keys: string[]) {
  for (const key of keys) {
    const value = valueToText(row[key]).trim();
    if (value) return value;
  }
  return "";
}

function employeeFromRow(row: Row): EmployeeOption {
  const id = firstText(row, ["id", "employee_id"]);
  const code = firstText(row, ["employee_code", "code", "employee_no", "employee_number", "id"]);
  const name = firstText(row, ["full_name", "employee_name", "name", "arabic_name"]);
  return { id, code, name, raw: row };
}

function rowBelongsToEmployee(row: Row, employee: EmployeeOption) {
  const rowId = firstText(row, ["employee_id", "id"]);
  const rowCode = firstText(row, ["employee_code", "code", "employee_no", "employee_number"]);
  const rowName = firstText(row, ["employee_name", "full_name", "name", "arabic_name"]);
  return Boolean(
    (employee.id && rowId === employee.id) ||
    (employee.code && rowCode.toLowerCase() === employee.code.toLowerCase()) ||
    (employee.name && rowName.toLowerCase() === employee.name.toLowerCase())
  );
}

export default function ReportsPage({ token, onOpenPage }: ReportsPageProps) {
  const [query, setQuery] = useState("");
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | "all">("all");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingId, setLoadingId] = useState("");
  const [error, setError] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [previewRows, setPreviewRows] = useState<Row[]>([]);
  const [pendingPdfId, setPendingPdfId] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);
  const employeeSearchRef = useRef<HTMLDivElement>(null);

  const employeeSuggestions = useMemo(() => {
    const text = employeeSearch.trim().toLowerCase();
    if (!text || selectedEmployee) return [];
    return employees
      .filter((employee) => `${employee.name} ${employee.code}`.toLowerCase().includes(text))
      .slice(0, 10);
  }, [employeeSearch, employees, selectedEmployee]);

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesCategory = category === "all" || report.category === category;
      const matchesQuery = !normalizedQuery || `${report.title} ${report.description}`.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  async function loadRows(report: ReportItem) {
    const response = await fetch(`${API_URL}${report.endpoint}`, { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail ?? "تعذر تحميل بيانات التقرير");
    const rows: Row[] = Array.isArray(result) ? result : result.items ?? [];
    const reportRows = report.filter ? rows.filter(report.filter) : rows;
    return selectedEmployee ? reportRows.filter((row) => rowBelongsToEmployee(row, selectedEmployee)) : reportRows;
  }

  useEffect(() => {
    let active = true;
    async function loadEmployees() {
      try {
        const response = await fetch(`${API_URL}/api/v1/employees`, { headers: { Authorization: `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.detail ?? "تعذر تحميل الموظفين");
        const rows: Row[] = Array.isArray(result) ? result : result.items ?? [];
        const options = rows.map(employeeFromRow).filter((employee) => employee.name || employee.code);
        if (active) setEmployees(options);
      } catch {
        if (active) setEmployees([]);
      }
    }
    void loadEmployees();
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    function closeDropdown(event: MouseEvent) {
      if (employeeSearchRef.current && !employeeSearchRef.current.contains(event.target as Node)) {
        setEmployeeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", closeDropdown);
    return () => document.removeEventListener("mousedown", closeDropdown);
  }, []);

  useEffect(() => {
    let active = true;
    async function loadCounts() {
      const next: Record<string, number> = {};
      for (const report of reports) {
        try { next[report.id] = (await loadRows(report)).length; } catch { next[report.id] = 0; }
      }
      if (active) setCounts(next);
    }
    void loadCounts();
    return () => { active = false; };
  }, [token, selectedEmployee]);

  async function openPreview(report: ReportItem, autoPdf = false) {
    setLoadingId(report.id);
    setError("");
    try {
      const rows = await loadRows(report);
      setPreviewRows(rows);
      setSelectedReport(report);
      if (autoPdf) setPendingPdfId(report.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تحميل التقرير");
    } finally {
      setLoadingId("");
    }
  }

  async function exportExcel(report: ReportItem, providedRows?: Row[]) {
    setLoadingId(`${report.id}-excel`);
    setError("");
    try {
      const rows = providedRows ?? await loadRows(report);
      if (!rows.length) throw new Error("لا توجد بيانات متاحة لتصدير هذا التقرير");
      const columns = getColumns(rows);
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Tahina HRMS Enterprise";
      workbook.created = new Date();
      const sheet = workbook.addWorksheet(report.title, { views: [{ rightToLeft: true, state: "frozen", ySplit: 5 }] });

      sheet.mergeCells(1, 1, 1, Math.max(columns.length, 1));
      const titleCell = sheet.getCell(1, 1);
      titleCell.value = "Tahina HRMS Enterprise";
      titleCell.font = { name: "Arial", size: 18, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEA6400" } };
      sheet.getRow(1).height = 32;

      sheet.mergeCells(2, 1, 2, Math.max(columns.length, 1));
      sheet.getCell(2, 1).value = report.title;
      sheet.getCell(2, 1).font = { name: "Arial", size: 15, bold: true, color: { argb: "FF1F2937" } };
      sheet.getCell(2, 1).alignment = { horizontal: "center" };

      sheet.mergeCells(3, 1, 3, Math.max(columns.length, 1));
      sheet.getCell(3, 1).value = `تاريخ إنشاء التقرير: ${new Date().toLocaleString("ar-SA")} | عدد السجلات: ${rows.length}`;
      sheet.getCell(3, 1).alignment = { horizontal: "center" };
      sheet.getCell(3, 1).font = { name: "Arial", size: 10, color: { argb: "FF6B7280" } };

      const headerRow = sheet.getRow(5);
      columns.forEach((column, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = columnLabels[column] ?? column;
        cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { top: { style: "thin", color: { argb: "FFD1D5DB" } }, bottom: { style: "thin", color: { argb: "FFD1D5DB" } }, left: { style: "thin", color: { argb: "FFD1D5DB" } }, right: { style: "thin", color: { argb: "FFD1D5DB" } } };
      });
      headerRow.height = 24;

      rows.forEach((row, rowIndex) => {
        const excelRow = sheet.getRow(rowIndex + 6);
        columns.forEach((column, columnIndex) => {
          const cell = excelRow.getCell(columnIndex + 1);
          cell.value = valueToText(row[column]);
          cell.font = { name: "Arial", size: 10 };
          cell.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowIndex % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC" } };
          cell.border = { bottom: { style: "hair", color: { argb: "FFE5E7EB" } } };
        });
      });

      columns.forEach((column, index) => {
        const maxLength = Math.max((columnLabels[column] ?? column).length, ...rows.map((row) => valueToText(row[column]).length));
        sheet.getColumn(index + 1).width = Math.min(Math.max(maxLength + 3, 13), 38);
      });
      sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5 + rows.length, column: columns.length } };
      sheet.pageSetup = { orientation: columns.length > 7 ? "landscape" : "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 };
      sheet.headerFooter.oddFooter = "&Rصفحة &P من &N&Cتم إنشاؤه بواسطة Tahina HRMS Enterprise";

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${safeFileName(report.title)}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تصدير Excel");
    } finally {
      setLoadingId("");
    }
  }

  async function exportPdf(report: ReportItem, rows: Row[]) {
    if (!reportRef.current) return;
    setLoadingId(`${report.id}-pdf`);
    setError("");
    try {
      if (!rows.length) throw new Error("لا توجد بيانات متاحة لتصدير هذا التقرير");
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const imageData = canvas.toDataURL("image/png", 1);
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? "landscape" : "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      let heightLeft = imageHeight;
      let position = margin;
      let page = 1;
      pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight, undefined, "FAST");
      heightLeft -= pageHeight - margin * 2;
      while (heightLeft > 0) {
        pdf.addPage();
        page += 1;
        position = margin - (imageHeight - heightLeft);
        pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight, undefined, "FAST");
        heightLeft -= pageHeight - margin * 2;
      }
      for (let current = 1; current <= page; current += 1) {
        pdf.setPage(current);
        pdf.setFontSize(8);
        pdf.setTextColor(110);
        pdf.text(`${current} / ${page}`, pageWidth / 2, pageHeight - 3, { align: "center" });
      }
      pdf.save(`${safeFileName(report.title)}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "تعذر تصدير PDF");
    } finally {
      setLoadingId("");
    }
  }

  const previewColumns = useMemo(() => getColumns(previewRows), [previewRows]);

  useEffect(() => {
    if (!pendingPdfId || !selectedReport || pendingPdfId !== selectedReport.id || !reportRef.current) return;
    const timer = window.setTimeout(() => {
      setPendingPdfId("");
      void exportPdf(selectedReport, previewRows);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [pendingPdfId, selectedReport, previewRows]);

  return (
    <>
      <div className="page-title reports-heading">
        <div><h1>مركز التقارير الاحترافي</h1><p>معاينة وطباعة وتصدير تقارير الموارد البشرية إلى PDF وExcel من مكان واحد.</p></div>
        <button type="button" className="reports-print" onClick={() => window.print()}><Printer size={18} /> طباعة الصفحة</button>
      </div>

      <section className="reports-summary">
        <article><FileText size={22} /><div><strong>{reports.length}</strong><span>تقارير متاحة</span></div></article>
        <article><Users size={22} /><div><strong>{counts.employees ?? "—"}</strong><span>موظف مسجل</span></div></article>
        <article><CalendarDays size={22} /><div><strong>{counts.leaves ?? "—"}</strong><span>سجل إجازة</span></div></article>
        <article><WalletCards size={22} /><div><strong>{counts.payroll ?? "—"}</strong><span>سجل رواتب</span></div></article>
      </section>

      <div className="reports-controls">
        <div className="reports-search-row">
          <div className="reports-toolbar"><Search size={20} /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن تقرير..." aria-label="البحث في التقارير" /></div>
          <div className="employee-autocomplete" ref={employeeSearchRef}>
            <div className={`employee-search-box ${employeeDropdownOpen ? "open" : ""}`}>
              <Users size={20} />
              <input
                type="text"
                value={employeeSearch}
                onFocus={() => setEmployeeDropdownOpen(true)}
                onChange={(event) => {
                  setEmployeeSearch(event.target.value);
                  setSelectedEmployee(null);
                  setEmployeeDropdownOpen(true);
                }}
                placeholder="ابحث باسم الموظف أو الكود..."
                aria-label="البحث عن موظف بالاسم أو الكود"
                autoComplete="off"
              />
              {(employeeSearch || selectedEmployee) && <button type="button" className="employee-clear" title="إلغاء اختيار الموظف" onClick={() => { setEmployeeSearch(""); setSelectedEmployee(null); setEmployeeDropdownOpen(false); }}><X size={16} /></button>}
            </div>
            {employeeDropdownOpen && employeeSearch.trim() && !selectedEmployee && (
              <div className="employee-suggestions" role="listbox">
                {employeeSuggestions.length ? employeeSuggestions.map((employee) => (
                  <button
                    type="button"
                    key={`${employee.id}-${employee.code}`}
                    className="employee-suggestion"
                    onClick={() => {
                      setSelectedEmployee(employee);
                      setEmployeeSearch(employee.name || employee.code);
                      setEmployeeDropdownOpen(false);
                    }}
                  >
                    <span className="employee-suggestion-avatar"><Users size={16} /></span>
                    <span className="employee-suggestion-info"><strong>{employee.name || "بدون اسم"}</strong><small>كود الموظف: {employee.code || "غير مسجل"}</small></span>
                  </button>
                )) : <div className="employee-no-results">لا يوجد موظف مطابق للاسم أو الكود.</div>}
              </div>
            )}
          </div>
        </div>
        {selectedEmployee && <div className="selected-employee-chip"><Users size={15} /><span>التقارير مفلترة على:</span><strong>{selectedEmployee.name}</strong><b>{selectedEmployee.code}</b><button type="button" onClick={() => { setEmployeeSearch(""); setSelectedEmployee(null); }}><X size={14} /></button></div>}
        <div className="report-categories" aria-label="تصنيف التقارير">
          {(Object.keys(categoryLabels) as Array<ReportCategory | "all">).map((key) => <button type="button" key={key} className={category === key ? "active" : ""} onClick={() => setCategory(key)}>{categoryLabels[key]}</button>)}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <section className="reports-grid">
        {filteredReports.map((report) => {
          const Icon = report.Icon;
          return (
            <article className="report-card report-card-pro" key={report.id}>
              <div className="report-card-top"><span className="report-icon"><Icon size={23} /></span><span className="report-count">{counts[report.id] ?? "—"} سجل</span></div>
              <div><h3>{report.title}</h3><p>{report.description}</p></div>
              <div className="report-actions-pro">
                <button type="button" className="report-preview" disabled={loadingId === report.id} onClick={() => void openPreview(report)}><Eye size={17} /> {loadingId === report.id ? "جارٍ..." : "معاينة"}</button>
                <button type="button" className="report-pdf" disabled={loadingId !== ""} onClick={() => void openPreview(report, true)} title="تصدير التقرير بصيغة PDF"><FileDown size={17} /> PDF</button>
                <button type="button" className="report-excel" disabled={loadingId !== ""} onClick={() => void exportExcel(report)}><FileSpreadsheet size={17} /> Excel</button>
                <button type="button" className="report-open" onClick={() => onOpenPage(report.targetPage)}>البيانات <ArrowLeft size={17} /></button>
              </div>
            </article>
          );
        })}
      </section>

      {filteredReports.length === 0 && <div className="empty"><Search size={42} /><h3>لا توجد تقارير مطابقة</h3><p>جرّب كلمة بحث أو تصنيفًا آخر.</p></div>}

      {selectedReport && (
        <div className="report-modal" role="dialog" aria-modal="true">
          <div className="report-modal-panel">
            <div className="report-modal-toolbar">
              <div><strong>{selectedReport.title}</strong><span>{previewRows.length} سجل</span></div>
              <div className="report-modal-actions">
                <button type="button" onClick={() => window.print()}><Printer size={17} /> طباعة</button>
                <button type="button" className="pdf" disabled={loadingId !== ""} onClick={() => void exportPdf(selectedReport, previewRows)}><FileDown size={17} /> PDF</button>
                <button type="button" className="excel" disabled={loadingId !== ""} onClick={() => void exportExcel(selectedReport, previewRows)}><FileSpreadsheet size={17} /> Excel</button>
                <button type="button" className="close" onClick={() => setSelectedReport(null)}><X size={19} /></button>
              </div>
            </div>

            <div className="report-document" ref={reportRef} dir="rtl">
              <header className="report-document-header">
                <img src="/tahina-logo.png" alt="Tahina" />
                <div><h2>Tahina HRMS Enterprise</h2><h3>{selectedReport.title}</h3><p>تقرير موارد بشرية رسمي</p></div>
                <div className="report-meta"><span>التاريخ</span><strong>{new Date().toLocaleDateString("ar-SA")}</strong><span>عدد السجلات</span><strong>{previewRows.length}</strong></div>
              </header>
              <div className="report-rule" />
              {previewRows.length ? (
                <div className="report-table-wrap">
                  <table className="report-table">
                    <thead><tr><th>#</th>{previewColumns.map((column) => <th key={column}>{columnLabels[column] ?? column}</th>)}</tr></thead>
                    <tbody>{previewRows.map((row, rowIndex) => <tr key={rowIndex}><td>{rowIndex + 1}</td>{previewColumns.map((column) => <td key={column}>{valueToText(row[column])}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              ) : <div className="report-empty">لا توجد بيانات في هذا التقرير.</div>}
              <footer className="report-document-footer"><span>تم إنشاء التقرير بواسطة Tahina HRMS Enterprise</span><span>تاريخ الطباعة: {new Date().toLocaleString("ar-SA")}</span><div className="report-signature">توقيع مسؤول الموارد البشرية</div></footer>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
