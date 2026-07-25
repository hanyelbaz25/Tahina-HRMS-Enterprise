from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.employee_assignments import EmployeeTransferInput, resolve_employee_branch, transfer_employee
from app.models import AuditLog, Branch, Employee, EmployeeBranchTransfer, User


engine = create_engine(
    "sqlite+pysqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def seed_data():
    db = TestingSession()
    branch_a = Branch(code="BR-001", name_ar="الفرع الأول", city="جدة", is_active=True)
    branch_b = Branch(code="BR-002", name_ar="الفرع الثاني", city="الرياض", is_active=True)
    user = User(
        username="admin",
        full_name="مدير النظام",
        password_hash="test",
        role="system_admin",
        is_active=True,
    )
    db.add_all([branch_a, branch_b, user])
    db.flush()
    employee = Employee(
        employee_no="EMP-0001",
        full_name_ar="موظف اختبار",
        identity_no="1000000001",
        phone="",
        job_title="اختبار",
        basic_salary=5000,
        allowances=500,
        branch_id=branch_a.id,
        is_active=True,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    db.refresh(branch_a)
    db.refresh(branch_b)
    db.refresh(user)
    return db, employee, branch_a, branch_b, user


def test_resolve_employee_branch_before_and_after_transfer():
    db, employee, branch_a, branch_b, _ = seed_data()
    db.add(
        EmployeeBranchTransfer(
            employee_id=employee.id,
            from_branch_id=branch_a.id,
            to_branch_id=branch_b.id,
            effective_date=date(2026, 7, 15),
            reason="اختبار",
            notes="",
            created_by="admin",
        )
    )
    db.commit()

    assert resolve_employee_branch(db, employee.id, date(2026, 7, 14)) == branch_a.id
    assert resolve_employee_branch(db, employee.id, date(2026, 7, 15)) == branch_b.id
    assert resolve_employee_branch(db, employee.id, date(2026, 8, 1)) == branch_b.id
    db.close()


def test_transfer_employee_updates_current_branch_and_audit_log():
    db, employee, branch_a, branch_b, user = seed_data()

    result = transfer_employee(
        employee.id,
        EmployeeTransferInput(
            to_branch_id=branch_b.id,
            effective_date=date.today(),
            reason="حاجة تشغيلية",
            notes="نقل تجريبي",
        ),
        db,
        user,
    )

    db.refresh(employee)
    assert result["from_branch_id"] == branch_a.id
    assert result["to_branch_id"] == branch_b.id
    assert employee.branch_id == branch_b.id
    assert db.query(EmployeeBranchTransfer).count() == 1
    assert db.query(AuditLog).filter(AuditLog.action == "transfer").count() == 1
    db.close()


def test_future_transfer_preserves_current_branch_until_effective_date():
    db, employee, branch_a, branch_b, user = seed_data()

    result = transfer_employee(
        employee.id,
        EmployeeTransferInput(
            to_branch_id=branch_b.id,
            effective_date=date(2099, 1, 1),
            reason="نقل مستقبلي",
            notes="",
        ),
        db,
        user,
    )

    db.refresh(employee)
    assert result["to_branch_id"] == branch_b.id
    assert employee.branch_id == branch_a.id
    assert resolve_employee_branch(db, employee.id, date(2098, 12, 31)) == branch_a.id
    assert resolve_employee_branch(db, employee.id, date(2099, 1, 1)) == branch_b.id
    db.close()
