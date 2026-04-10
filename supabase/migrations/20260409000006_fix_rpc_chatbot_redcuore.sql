-- Step 1: Add box dimension columns
ALTER TABLE chatbot_redcuore.certificate_templates
  ADD COLUMN IF NOT EXISTS name_w FLOAT NOT NULL DEFAULT 400,
  ADD COLUMN IF NOT EXISTS name_h FLOAT NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS dni_w  FLOAT NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS dni_h  FLOAT NOT NULL DEFAULT 40;

-- Step 2: Drop old max_width columns
ALTER TABLE chatbot_redcuore.certificate_templates
  DROP COLUMN IF EXISTS name_max_width,
  DROP COLUMN IF EXISTS dni_max_width;

-- Step 3: Recreate RPC in chatbot_redcuore schema with new box params
CREATE OR REPLACE FUNCTION chatbot_redcuore.upsert_certificate_template(
  p_id UUID,
  p_user_id UUID,
  p_name TEXT,
  p_pdf_url TEXT,
  p_name_x FLOAT, p_name_y FLOAT, p_name_w FLOAT, p_name_h FLOAT,
  p_name_font_size INT, p_name_align TEXT, p_name_line_spacing FLOAT,
  p_dni_x FLOAT, p_dni_y FLOAT, p_dni_w FLOAT, p_dni_h FLOAT,
  p_dni_font_size INT, p_dni_align TEXT, p_dni_line_spacing FLOAT,
  p_qr_x FLOAT, p_qr_y FLOAT, p_qr_size INT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = chatbot_redcuore
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO certificate_templates (
      user_id, name, pdf_url,
      name_x, name_y, name_w, name_h, name_font_size, name_align, name_line_spacing,
      dni_x, dni_y, dni_w, dni_h, dni_font_size, dni_align, dni_line_spacing,
      qr_x, qr_y, qr_size
    ) VALUES (
      p_user_id, p_name, p_pdf_url,
      p_name_x, p_name_y, p_name_w, p_name_h, p_name_font_size, p_name_align, p_name_line_spacing,
      p_dni_x, p_dni_y, p_dni_w, p_dni_h, p_dni_font_size, p_dni_align, p_dni_line_spacing,
      p_qr_x, p_qr_y, p_qr_size
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE certificate_templates SET
      name = p_name, pdf_url = p_pdf_url,
      name_x = p_name_x, name_y = p_name_y, name_w = p_name_w, name_h = p_name_h,
      name_font_size = p_name_font_size, name_align = p_name_align, name_line_spacing = p_name_line_spacing,
      dni_x = p_dni_x, dni_y = p_dni_y, dni_w = p_dni_w, dni_h = p_dni_h,
      dni_font_size = p_dni_font_size, dni_align = p_dni_align, dni_line_spacing = p_dni_line_spacing,
      qr_x = p_qr_x, qr_y = p_qr_y, qr_size = p_qr_size
    WHERE id = p_id AND user_id = p_user_id
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;
