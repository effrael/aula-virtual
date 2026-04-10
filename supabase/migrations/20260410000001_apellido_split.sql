-- ─── 1. Apellido positioning on certificate_templates ──────────────────────────
ALTER TABLE chatbot_redcuore.certificate_templates
  ADD COLUMN IF NOT EXISTS apellido_x         FLOAT NOT NULL DEFAULT 97,
  ADD COLUMN IF NOT EXISTS apellido_y         FLOAT NOT NULL DEFAULT 415,
  ADD COLUMN IF NOT EXISTS apellido_w         FLOAT NOT NULL DEFAULT 400,
  ADD COLUMN IF NOT EXISTS apellido_h         FLOAT NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS apellido_font_size  INT   NOT NULL DEFAULT 22,
  ADD COLUMN IF NOT EXISTS apellido_align      TEXT  NOT NULL DEFAULT 'center';

-- ─── 2. Separate apellido column on certificates ─────────────────────────────
ALTER TABLE chatbot_redcuore.certificates
  ADD COLUMN IF NOT EXISTS recipient_apellido TEXT NOT NULL DEFAULT '';

-- ─── 3. Replace RPC — add apellido params ────────────────────────────────────
CREATE OR REPLACE FUNCTION chatbot_redcuore.upsert_certificate_template(
  p_id UUID, p_user_id UUID, p_name TEXT, p_pdf_url TEXT,
  -- front: nombre
  p_name_x FLOAT, p_name_y FLOAT, p_name_y2 FLOAT,
  p_name_w FLOAT, p_name_h FLOAT,
  p_name_font_size INT, p_name_align TEXT, p_name_line_spacing FLOAT,
  -- front: apellido
  p_apellido_x FLOAT, p_apellido_y FLOAT, p_apellido_w FLOAT, p_apellido_h FLOAT,
  p_apellido_font_size INT, p_apellido_align TEXT,
  -- front: dni (back page)
  p_dni_x FLOAT, p_dni_y FLOAT, p_dni_w FLOAT, p_dni_h FLOAT,
  p_dni_font_size INT, p_dni_align TEXT, p_dni_line_spacing FLOAT,
  -- front: qr
  p_qr_x FLOAT, p_qr_y FLOAT, p_qr_size INT,
  -- back: code
  p_code_x FLOAT, p_code_y FLOAT, p_code_w FLOAT, p_code_h FLOAT,
  p_code_font_size INT, p_code_align TEXT,
  -- back: status
  p_status_x FLOAT, p_status_y FLOAT, p_status_w FLOAT, p_status_h FLOAT,
  p_status_font_size INT, p_status_align TEXT,
  -- back: instructor
  p_instructor_x FLOAT, p_instructor_y FLOAT, p_instructor_w FLOAT, p_instructor_h FLOAT,
  p_instructor_font_size INT, p_instructor_align TEXT,
  -- back: inst_id
  p_inst_id_x FLOAT, p_inst_id_y FLOAT, p_inst_id_w FLOAT, p_inst_id_h FLOAT,
  p_inst_id_font_size INT, p_inst_id_align TEXT
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
      name_x, name_y, name_y2, name_w, name_h, name_font_size, name_align, name_line_spacing,
      apellido_x, apellido_y, apellido_w, apellido_h, apellido_font_size, apellido_align,
      dni_x, dni_y, dni_w, dni_h, dni_font_size, dni_align, dni_line_spacing,
      qr_x, qr_y, qr_size,
      code_x, code_y, code_w, code_h, code_font_size, code_align,
      status_x, status_y, status_w, status_h, status_font_size, status_align,
      instructor_x, instructor_y, instructor_w, instructor_h, instructor_font_size, instructor_align,
      inst_id_x, inst_id_y, inst_id_w, inst_id_h, inst_id_font_size, inst_id_align
    ) VALUES (
      p_user_id, p_name, p_pdf_url,
      p_name_x, p_name_y, p_name_y2, p_name_w, p_name_h, p_name_font_size, p_name_align, p_name_line_spacing,
      p_apellido_x, p_apellido_y, p_apellido_w, p_apellido_h, p_apellido_font_size, p_apellido_align,
      p_dni_x, p_dni_y, p_dni_w, p_dni_h, p_dni_font_size, p_dni_align, p_dni_line_spacing,
      p_qr_x, p_qr_y, p_qr_size,
      p_code_x, p_code_y, p_code_w, p_code_h, p_code_font_size, p_code_align,
      p_status_x, p_status_y, p_status_w, p_status_h, p_status_font_size, p_status_align,
      p_instructor_x, p_instructor_y, p_instructor_w, p_instructor_h, p_instructor_font_size, p_instructor_align,
      p_inst_id_x, p_inst_id_y, p_inst_id_w, p_inst_id_h, p_inst_id_font_size, p_inst_id_align
    ) RETURNING id INTO v_id;
  ELSE
    UPDATE certificate_templates SET
      name = p_name, pdf_url = p_pdf_url,
      name_x = p_name_x, name_y = p_name_y, name_y2 = p_name_y2,
      name_w = p_name_w, name_h = p_name_h,
      name_font_size = p_name_font_size, name_align = p_name_align, name_line_spacing = p_name_line_spacing,
      apellido_x = p_apellido_x, apellido_y = p_apellido_y,
      apellido_w = p_apellido_w, apellido_h = p_apellido_h,
      apellido_font_size = p_apellido_font_size, apellido_align = p_apellido_align,
      dni_x = p_dni_x, dni_y = p_dni_y, dni_w = p_dni_w, dni_h = p_dni_h,
      dni_font_size = p_dni_font_size, dni_align = p_dni_align, dni_line_spacing = p_dni_line_spacing,
      qr_x = p_qr_x, qr_y = p_qr_y, qr_size = p_qr_size,
      code_x = p_code_x, code_y = p_code_y, code_w = p_code_w, code_h = p_code_h,
      code_font_size = p_code_font_size, code_align = p_code_align,
      status_x = p_status_x, status_y = p_status_y, status_w = p_status_w, status_h = p_status_h,
      status_font_size = p_status_font_size, status_align = p_status_align,
      instructor_x = p_instructor_x, instructor_y = p_instructor_y,
      instructor_w = p_instructor_w, instructor_h = p_instructor_h,
      instructor_font_size = p_instructor_font_size, instructor_align = p_instructor_align,
      inst_id_x = p_inst_id_x, inst_id_y = p_inst_id_y, inst_id_w = p_inst_id_w, inst_id_h = p_inst_id_h,
      inst_id_font_size = p_inst_id_font_size, inst_id_align = p_inst_id_align
    WHERE id = p_id AND user_id = p_user_id
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;
