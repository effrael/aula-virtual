 ALTER TABLE chatbot_redcuore.certificate_templates
    DROP CONSTRAINT IF EXISTS certificate_templates_user_id_fkey;

  ALTER TABLE chatbot_redcuore.certificates
    DROP CONSTRAINT IF EXISTS certificates_user_id_fkey;


  ALTER TABLE chatbot_redcuore.certificate_templates
    ADD COLUMN IF NOT EXISTS name_align TEXT NOT NULL DEFAULT 'center',
    ADD COLUMN IF NOT EXISTS name_max_width FLOAT NOT NULL DEFAULT 450,
    ADD COLUMN IF NOT EXISTS name_line_spacing FLOAT NOT NULL DEFAULT 1.3,
    ADD COLUMN IF NOT EXISTS dni_align TEXT NOT NULL DEFAULT 'center',
    ADD COLUMN IF NOT EXISTS dni_max_width FLOAT NOT NULL DEFAULT 300,
    ADD COLUMN IF NOT EXISTS dni_line_spacing FLOAT NOT NULL DEFAULT 1.3;