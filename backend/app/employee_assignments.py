from __future__ import annotations

from collections.abc import Callable
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog, Branch, Employee, EmployeeBranchTransfer, User


class EmployeeTransferInput(BaseModel):
    to_branch_id: int
    effective_date: date
    reason: str = Field(default="", max_length=300)
    notes: str = Field(default="", max_length=500)


class EmployeeTransferResponse(BaseModel):
    id: int
    employee_id: int
    employee_no: str
    employee_name: str
    from_branch_id: int
    from_branch_name: str
    to_branch_id: int
    to_branch_name: str
    effective_date: date
    reason: str
    notes: str
    created_by: str


def transfer_dict(item: EmployeeBranchTransfer) -> dict:
    return {
        "id": item.id,
        "employee_id": item.employee_id,
        "employee_no": item.employee.employee_no,
        "employee_name": item.employee.full_name_ar,
        "from_branch_id": item.from_branch_id,
        "from_branch_name": item.from_branch.name_ar,
        "to_branch_id": item.to_branch_id,
        "to_branch_name": item.to_branch.name_ar,
        "effective_date": item.effective_date.isoformat(),
        "reason": item.reason,
        "notes": item.notes,
        "created_by": item.created_by,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


def resolve_employee_branch(db: Session, employee_id: int, on_date: date) -> int:
    """Resolve the employee branch for a historical date without rewriting history."""
    employee = db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=404, detail="الموظف غير موجود")

    transfer = (
        db.query(EmployeeBranchTransfer)
        .filter(
            EmployeeBranchTransfer.employee_id == employee_id,
            EmployeeBranchTransfer.effective_date <= on_date,
        )
        .order_by(EmployeeBranchTransfer.effective_date.desc(), EmployeeBranchTransfer.id.desc())
        .first()
    )
    if transfer:
        return transfer.to_branch_id

    earliest_transfer = (
        db.query(EmployeeBranchTransfer)
        .filter(EmployeeBranchTransfer.employee_id == employee_id)
        .order_by(EmployeeBranchTransfer.effective_date.asc(), EmployeeBranchTransfer.id.asc())
        .first()
    )
    if earliest_transfer and on_date < earliest_transfer.effective_date:
        return earliest_transfer.from_branch_id

    return employee.branch_id


def build_employee_assignments_router(
    current_user_dependency: Callable,
    require_roles_dependency: Callable,
) -> APIRouter:
    router = APIRouter(prefix="/api/v1", tags=["employee-assignments"])

    @router.get("/employees/{employee_id}/transfers")
    def list_employee_transfers(
        employee_id: int,
        db: Session = Depends(get_db),
        user: User = Depends(current_user_dependency),
    ):
        employee = db.get(Employee, employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="الموظف غير موجود")
        items = (
            db.query(EmployeeBranchTransfer)
            .filter(EmployeeBranchTransfer.employee_id == employee_id)
            .order_by(EmployeeBranchTransfer.effective_date.desc(), EmployeeBranchTransfer.id.desc())
            .all()
        )
        return [transfer_dict(item) for item in items]

    @router.get("/employee-transfers")
    def list_transfers(
        employee_id: int | None = None,
        branch_id: int | None = None,
        from_date: date | None = Query(default=None),
        to_date: date | None = Query(default=None),
        db: Session = Depends(get_db),
        user: User = Depends(current_user_dependency),
    ):
        query = db.query(EmployeeBranchTransfer)
        if employee_id:
            query = query.filter(EmployeeBranchTransfer.employee_id == employee_id)
        if branch_id:
            query = query.filter(
                (EmployeeBranchTransfer.from_branch_id == branch_id)
                | (EmployeeBranchTransfer.to_branch_id == branch_id)
            )
        if from_date:
            query = query.filter(EmployeeBranchTransfer.effective_date >= from_date)
        if to_date:
            query = query.filter(EmployeeBranchTransfer.effective_date <= to_date)
        return [
            transfer_dict(item)
            for item in query.order_by(
                EmployeeBranchTransfer.effective_date.desc(),
                EmployeeBranchTransfer.id.desc(),
            ).all()
        ]

    @router.post("/employees/{employee_id}/transfers", status_code=201)
    def transfer_employee(
        employee_id: int,
        data: EmployeeTransferInput,
        db: Session = Depends(get_db),
        user: User = Depends(require_roles_dependency("system_admin", "hr_manager")),
    ):
        employee = db.get(Employee, employee_id)
        if not employee:
            raise HTTPException(status_code=404, detail="الموظف غير موجود")

        target_branch = db.get(Branch, data.to_branch_id)
        if not target_branch or not target_branch.is_active:
            raise HTTPException(status_code=400, detail="الفرع الجديد غير موجود أو غير نشط")

        if data.to_branch_id == employee.branch_id:
            raise HTTPException(status_code=409, detail="الموظف موجود بالفعل في الفرع المحدد")

        duplicate = (
            db.query(EmployeeBranchTransfer)
            .filter(
                EmployeeBranchTransfer.employee_id == employee_id,
                EmployeeBranchTransfer.effective_date == data.effective_date,
            )
            .first()
        )
        if duplicate:
            raise HTTPException(status_code=409, detail="يوجد انتقال مسجل للموظف في نفس التاريخ")

        future_transfer = (
            db.query(EmployeeBranchTransfer)
            .filter(
                EmployeeBranchTransfer.employee_id == employee_id,
                EmployeeBranchTransfer.effective_date > data.effective_date,
            )
            .first()
        )
        if future_transfer:
            raise HTTPException(
                status_code=409,
                detail="لا يمكن إدخال انتقال أقدم من انتقال مستقبلي موجود قبل معالجة التسلسل الزمني",
            )

        from_branch_id = resolve_employee_branch(db, employee_id, data.effective_date)
        if from_branch_id == data.to_branch_id:
            raise HTTPException(status_code=409, detail="لا يوجد تغيير فعلي في الفرع في التاريخ المحدد")

        item = EmployeeBranchTransfer(
            employee_id=employee_id,
            from_branch_id=from_branch_id,
            to_branch_id=data.to_branch_id,
            effective_date=data.effective_date,
            reason=data.reason.strip(),
            notes=data.notes.strip(),
            created_by=user.username,
        )
        db.add(item)

        # The employee record represents the current assignment only.
        # Historical attendance, payroll, and reports must use dated assignment data.
        if data.effective_date <= date.today():
            employee.branch_id = data.to_branch_id

        db.flush()
        db.add(
            AuditLog(
                username=user.username,
                action="transfer",
                entity="employee",
                details=(
                    f"employee_id={employee_id}; from_branch_id={from_branch_id}; "
                    f"to_branch_id={data.to_branch_id}; effective_date={data.effective_date.isoformat()}"
                ),
            )
        )
        db.commit()
        db.refresh(item)
        return transfer_dict(item)

    @router.get("/employees/{employee_id}/branch-at-date")
    def employee_branch_at_date(
        employee_id: int,
        on_date: date,
        db: Session = Depends(get_db),
        user: User = Depends(current_user_dependency),
    ):
        branch_id = resolve_employee_branch(db, employee_id, on_date)
        branch = db.get(Branch, branch_id)
        return {
            "employee_id": employee_id,
            "on_date": on_date.isoformat(),
            "branch_id": branch_id,
            "branch_name": branch.name_ar if branch else "",
        }

    return router
