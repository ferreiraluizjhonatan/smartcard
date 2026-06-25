-- Add closed_at column to tickets table to track when a pendency is resolved
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;
