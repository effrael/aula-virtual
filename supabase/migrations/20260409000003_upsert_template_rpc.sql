CREATE OR REPLACE FUNCTION chatbot_redcuore.upsert_certificate_template(
  p_id UUID,
  p_user_id UUID,
  p_name TEXT,
  p_pdf_url TEXT,
  p_name_x FLOAT, p_name_y FLOAT, p_name_font_size INT,
  p_name_align TEXT, p_name_max_width FLOAT, p_name_line_spacing FLOAT,
  p_dni_x FLOAT, p_dni_y FLOAT, p_dni_font_size INT,
  p_dni_align TEXT, p_dni_max_width FLOAT, p_dni_line_spacing FLOAT,
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
      name_x, name_y, name_font_size, name_align, name_max_width, name_line_spacing,
      dni_x, dni_y, dni_font_size, dni_align, dni_max_width, dni_line_spacing,
      qr_x, qr_y, qr_size
    ) VALUES (
      p_user_id, p_name, p_pdf_url,
      p_name_x, p_name_y, p_name_font_size, p_name_align, p_name_max_width, p_name_line_spacing,
      p_dni_x, p_dni_y, p_dni_font_size, p_dni_align, p_dni_max_width, p_dni_line_spacing,
      p_qr_x, p_qr_y, p_qr_size
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE certificate_templates SET
      user_id = p_user_id, name = p_name, pdf_url = p_pdf_url,
      name_x = p_name_x, name_y = p_name_y, name_font_size = p_name_font_size,
      name_align = p_name_align, name_max_width = p_name_max_width, name_line_spacing = p_name_line_spacing,
      dni_x = p_dni_x, dni_y = p_dni_y, dni_font_size = p_dni_font_size,
      dni_align = p_dni_align, dni_max_width = p_dni_max_width, dni_line_spacing = p_dni_line_spacing,
      qr_x = p_qr_x, qr_y = p_qr_y, qr_size = p_qr_size
    WHERE id = p_id AND user_id = p_user_id
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;
