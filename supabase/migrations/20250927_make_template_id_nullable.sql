-- Make template_id nullable in class_template_settings table
-- This allows class teacher appointments without requiring a template

ALTER TABLE class_template_settings 
ALTER COLUMN template_id DROP NOT NULL;

-- Update the foreign key constraint to allow NULL values
-- (PostgreSQL automatically handles this when we drop NOT NULL)
