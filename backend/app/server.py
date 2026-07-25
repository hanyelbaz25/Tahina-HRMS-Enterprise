"""Tahina HRMS Enterprise ASGI entrypoint.

This module composes the legacy application with the v3 employee assignment
engine without changing the existing API implementation in app.main.
"""

from app.main import app
from app.employee_assignments import router as employee_assignments_router

app.include_router(employee_assignments_router)
