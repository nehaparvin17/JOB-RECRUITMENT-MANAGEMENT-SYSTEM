const { db } = require('./src/config/db');

console.log('\n========================================================================================');
console.log('                          JOBHUB REGISTERED USERS & CREDENTIALS                         ');
console.log('========================================================================================\n');

const users = db.prepare(`
  SELECT 
    id,
    first_name || ' ' || last_name AS name,
    email,
    role,
    company_name,
    password_hash,
    CASE 
      WHEN password_hash LIKE '$2a$%' OR password_hash LIKE '$2b$%' THEN 'bcrypt (Blowfish Hash)'
      ELSE 'Plain/Other'
    END AS password_encryption_type,
    is_active,
    created_at
  FROM users
  ORDER BY id ASC
`).all();

console.table(users.map(u => ({
  ID: u.id,
  Name: u.name,
  Email: u.email,
  Role: u.role,
  Company: u.company_name || '-',
  'Password Hash (Bcrypt)': u.password_hash.substring(0, 20) + '...',
  'Hash Type': u.password_encryption_type,
  Active: u.is_active ? '✅ Active' : '❌ Disabled'
})));

console.log('\n💡 [SECURITY EXPLANATION]');
console.log('1. Passwords are never stored in plain text.');
console.log('2. They are hashed using bcrypt with 10 salt rounds (Industry standard one-way hash).');
console.log('3. When a user logs in, bcrypt.compare(inputPassword, storedHash) verifies the password.');
console.log('\n========================================================================================\n');
