-- Migration: add is_active field to users table for soft delete/deactivation
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX idx_users_is_active ON users(is_active);
