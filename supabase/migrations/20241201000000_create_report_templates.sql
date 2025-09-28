-- Create report_templates table
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  html_content TEXT NOT NULL,
  css_content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_report_templates_school_id ON report_templates(school_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_created_at ON report_templates(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Schools can view their own templates" ON report_templates
  FOR SELECT USING (
    school_id IN (
      SELECT id FROM schools WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Schools can insert their own templates" ON report_templates
  FOR INSERT WITH CHECK (
    school_id IN (
      SELECT id FROM schools WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Schools can update their own templates" ON report_templates
  FOR UPDATE USING (
    school_id IN (
      SELECT id FROM schools WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Schools can delete their own templates" ON report_templates
  FOR DELETE USING (
    school_id IN (
      SELECT id FROM schools WHERE user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
