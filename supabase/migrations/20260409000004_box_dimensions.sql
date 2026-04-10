ALTER TABLE chatbot_redcuore.certificate_templates
  ADD COLUMN IF NOT EXISTS name_w FLOAT NOT NULL DEFAULT 400,
  ADD COLUMN IF NOT EXISTS name_h FLOAT NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS dni_w  FLOAT NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS dni_h  FLOAT NOT NULL DEFAULT 40;

-- Drop max_width columns (replaced by box dimensions)
ALTER TABLE chatbot_redcuore.certificate_templates
  DROP COLUMN IF EXISTS name_max_width,
  DROP COLUMN IF EXISTS dni_max_width;
