-- Fix: admin user is_active was set to false — re-enable it
UPDATE users SET is_active = 1 WHERE email = 'admin@shiv.co';

-- Also ensure all seeded users are active
UPDATE users SET is_active = 1 WHERE id IN ('u-1','u-2','u-3','u-4','u-5','u-6');

-- Verify
SELECT id, name, email, role, is_active FROM users;
