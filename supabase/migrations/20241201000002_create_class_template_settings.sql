-- Create class_template_settings table
CREATE TABLE IF NOT EXISTS class_template_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  class_name VARCHAR(255) NOT NULL,
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  is_o_level BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(school_id, class_name)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_class_template_settings_school_id ON class_template_settings(school_id);
CREATE INDEX IF NOT EXISTS idx_class_template_settings_class_name ON class_template_settings(class_name);

-- Enable RLS (Row Level Security)
ALTER TABLE class_template_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Schools can view their own class template settings" ON class_template_settings
  FOR SELECT USING (
    school_id IN (
      SELECT school_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Schools can insert their own class template settings" ON class_template_settings
  FOR INSERT WITH CHECK (
    school_id IN (
      SELECT school_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Schools can update their own class template settings" ON class_template_settings
  FOR UPDATE USING (
    school_id IN (
      SELECT school_id FROM users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Schools can delete their own class template settings" ON class_template_settings
  FOR DELETE USING (
    school_id IN (
      SELECT school_id FROM users WHERE user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_class_template_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_class_template_settings_updated_at
  BEFORE UPDATE ON class_template_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_class_template_settings_updated_at();
