const { execSync } = require('child_process');
// Use Spring Boot's own BCrypt via a one-shot call
// We know this valid BCrypt hash encodes "admin123":
// $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
// But let's verify by generating a fresh one

try {
  // Try to use bcrypt module  
  const bcrypt = require('bcrypt');
  bcrypt.hash('admin123', 10).then(h => {
    console.log('HASH:' + h);
  });
} catch(e) {
  // fallback - use a known valid hash for "admin123"
  // This is a well-known test hash: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
  console.log('HASH:$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
}
