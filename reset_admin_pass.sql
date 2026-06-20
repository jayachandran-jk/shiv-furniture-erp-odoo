-- Restore admin password to: admin
-- This is a fresh BCrypt(10) hash of the string "admin"
UPDATE users 
SET password_hash = '$2a$10$eNUXoXHLrRhVeuzfxCTMXeGUNRGQ46PTxi6u46sD7PKOy7uGD0MIq'
WHERE email = 'admin@shiv.co';

-- Verify
SELECT id, name, email, role, password_hash FROM users WHERE email = 'admin@shiv.co';
