-- Migration: add first_login_token to users table
ALTER TABLE users ADD COLUMN first_login_token TEXT;
CREATE INDEX idx_users_first_login_token ON users(first_login_token);
