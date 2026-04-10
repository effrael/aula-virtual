-- Create storage bucket for certificate templates
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificate-templates', 'certificate-templates', true)
ON CONFLICT (id) DO NOTHING;

-- Certificate templates table
CREATE TABLE IF NOT EXISTS chatbot_redcuore.certificate_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  name_x FLOAT NOT NULL DEFAULT 200,
  name_y FLOAT NOT NULL DEFAULT 400,
  name_font_size INTEGER NOT NULL DEFAULT 28,
  dni_x FLOAT NOT NULL DEFAULT 200,
  dni_y FLOAT NOT NULL DEFAULT 360,
  dni_font_size INTEGER NOT NULL DEFAULT 18,
  qr_x FLOAT NOT NULL DEFAULT 460,
  qr_y FLOAT NOT NULL DEFAULT 40,
  qr_size INTEGER NOT NULL DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Issued certificates table
CREATE TABLE IF NOT EXISTS chatbot_redcuore.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES chatbot_redcuore.certificate_templates(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  dni TEXT NOT NULL,
  issued_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE chatbot_redcuore.certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_redcuore.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own templates"
  ON chatbot_redcuore.certificate_templates
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users manage their own issued certificates
CREATE POLICY "Users insert own certificates"
  ON chatbot_redcuore.certificates
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own certificates"
  ON chatbot_redcuore.certificates
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own certificates"
  ON chatbot_redcuore.certificates
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Public can read certificates (for QR code verification)
CREATE POLICY "Public verify certificates"
  ON chatbot_redcuore.certificates
  FOR SELECT
  USING (true);

-- Storage policies
CREATE POLICY "Auth users upload templates"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'certificate-templates');

CREATE POLICY "Public read templates"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'certificate-templates');

CREATE POLICY "Auth users update templates"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'certificate-templates');

CREATE POLICY "Auth users delete templates"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'certificate-templates');
