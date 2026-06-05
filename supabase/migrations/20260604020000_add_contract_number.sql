-- Add contract_number to elevators
ALTER TABLE elevators ADD COLUMN IF NOT EXISTS contract_number text;

-- Create mestre_progress table for the Foreman Portal
CREATE TABLE IF NOT EXISTS mestre_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    elevator_id uuid REFERENCES elevators(id) ON DELETE CASCADE,
    phase_name text NOT NULL,
    percentage integer DEFAULT 0,
    notes text,
    photo_urls text[],
    status text DEFAULT 'in_progress',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- RLS policies
ALTER TABLE mestre_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users" ON mestre_progress
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON mestre_progress
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON mestre_progress
    FOR UPDATE USING (true);
