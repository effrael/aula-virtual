-- Remove FK to auth.users (not compatible cross-schema in chatbot_redcuore)
ALTER TABLE chatbot_redcuore.certificate_templates
  DROP CONSTRAINT IF EXISTS certificate_templates_user_id_fkey;

ALTER TABLE chatbot_redcuore.certificates
  DROP CONSTRAINT IF EXISTS certificates_user_id_fkey;
