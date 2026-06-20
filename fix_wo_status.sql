-- Fix seeded work orders: change status from "Done" to "Completed" to match backend expectations
UPDATE work_orders SET status = 'Completed' WHERE status = 'Done';

-- Verify
SELECT mo_id, id, name, status FROM work_orders ORDER BY mo_id, id;
