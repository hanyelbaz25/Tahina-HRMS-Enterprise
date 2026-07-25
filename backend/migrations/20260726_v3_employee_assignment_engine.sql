-- Tahina HRMS Enterprise v3.0
-- Employee Assignment Engine migration
-- Safe, additive migration. Existing attendance records are preserved.

BEGIN;

CREATE TABLE IF NOT EXISTS employee_branch_transfers (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    from_branch_id INTEGER NOT NULL REFERENCES branches(id),
    to_branch_id INTEGER NOT NULL REFERENCES branches(id),
    effective_date DATE NOT NULL,
    reason VARCHAR(300) NOT NULL DEFAULT '',
    notes VARCHAR(500) NOT NULL DEFAULT '',
    created_by VARCHAR(60) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_employee_transfer_different_branches CHECK (from_branch_id <> to_branch_id),
    CONSTRAINT uq_employee_branch_transfer_date UNIQUE (employee_id, effective_date)
);

CREATE INDEX IF NOT EXISTS ix_employee_branch_transfers_employee_id
    ON employee_branch_transfers(employee_id);
CREATE INDEX IF NOT EXISTS ix_employee_branch_transfers_effective_date
    ON employee_branch_transfers(effective_date);
CREATE INDEX IF NOT EXISTS ix_employee_branch_transfers_from_branch_id
    ON employee_branch_transfers(from_branch_id);
CREATE INDEX IF NOT EXISTS ix_employee_branch_transfers_to_branch_id
    ON employee_branch_transfers(to_branch_id);

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS branch_id INTEGER;

-- Freeze all historical attendance under the employee's current branch at migration time.
-- This does not change attendance dates, times, notes, or employee references.
UPDATE attendance a
SET branch_id = e.branch_id
FROM employees e
WHERE a.employee_id = e.id
  AND a.branch_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_attendance_branch_id'
    ) THEN
        ALTER TABLE attendance
            ADD CONSTRAINT fk_attendance_branch_id
            FOREIGN KEY (branch_id) REFERENCES branches(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_attendance_branch_id ON attendance(branch_id);

-- Only enforce NOT NULL after all existing rows have been backfilled.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM attendance WHERE branch_id IS NULL) THEN
        ALTER TABLE attendance ALTER COLUMN branch_id SET NOT NULL;
    END IF;
END $$;

COMMIT;
