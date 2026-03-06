-- Migration: Add places quantity to PL
-- Created: 2026-03-06

ALTER TABLE pl 
ADD COLUMN IF NOT EXISTS places integer DEFAULT 1;

-- Обновляем существующие записи
UPDATE pl SET places = 1 WHERE places IS NULL;
