-- ─── 1. Adaptive name Y (2+ lines) ─────────────────────────────────────────────
ALTER TABLE chatbot_redcuore.certificate_templates
  ADD COLUMN IF NOT EXISTS name_y2 FLOAT NOT NULL DEFAULT 478;

-- ─── 2. Back-page field positions (CÓDIGO, ESTATUS, INSTRUCTOR, Inst. ID) ───────
ALTER TABLE chatbot_redcuore.certificate_templates
  ADD COLUMN IF NOT EXISTS code_x        FLOAT NOT NULL DEFAULT 147,
  ADD COLUMN IF NOT EXISTS code_y        FLOAT NOT NULL DEFAULT 650,
  ADD COLUMN IF NOT EXISTS code_w        FLOAT NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS code_h        FLOAT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS code_font_size INT   NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS code_align    TEXT  NOT NULL DEFAULT 'left',

  ADD COLUMN IF NOT EXISTS status_x        FLOAT NOT NULL DEFAULT 147,
  ADD COLUMN IF NOT EXISTS status_y        FLOAT NOT NULL DEFAULT 600,
  ADD COLUMN IF NOT EXISTS status_w        FLOAT NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS status_h        FLOAT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS status_font_size INT   NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS status_align    TEXT  NOT NULL DEFAULT 'left',

  ADD COLUMN IF NOT EXISTS instructor_x        FLOAT NOT NULL DEFAULT 147,
  ADD COLUMN IF NOT EXISTS instructor_y        FLOAT NOT NULL DEFAULT 550,
  ADD COLUMN IF NOT EXISTS instructor_w        FLOAT NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS instructor_h        FLOAT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS instructor_font_size INT   NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS instructor_align    TEXT  NOT NULL DEFAULT 'left',

  ADD COLUMN IF NOT EXISTS inst_id_x        FLOAT NOT NULL DEFAULT 147,
  ADD COLUMN IF NOT EXISTS inst_id_y        FLOAT NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS inst_id_w        FLOAT NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS inst_id_h        FLOAT NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS inst_id_font_size INT   NOT NULL DEFAULT 16,
  ADD COLUMN IF NOT EXISTS inst_id_align    TEXT  NOT NULL DEFAULT 'left';

-- ─── 3. Extra columns on certificates (values printed on back page) ─────────────
ALTER TABLE chatbot_redcuore.certificates
  ADD COLUMN IF NOT EXISTS cert_code  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS instructor TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS inst_id    TEXT NOT NULL DEFAULT '';

-- ─── 4. Replace RPC with new signature ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION chatbot_redcuore.upsert_certificate_template(
  p_id UUID, p_user_id UUID, p_name TEXT, p_pdf_url TEXT,
  -- front: name
  p_name_x FLOAT, p_name_y FLOAT, p_name_y2 FLOAT,
  p_name_w FLOAT, p_name_h FLOAT,
  p_name_font_size INT, p_name_align TEXT, p_name_line_spacing FLOAT,
  -- front: dni
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
      dni_x, dni_y, dni_w, dni_h, dni_font_size, dni_align, dni_line_spacing,
      qr_x, qr_y, qr_size,
      code_x, code_y, code_w, code_h, code_font_size, code_align,
      status_x, status_y, status_w, status_h, status_font_size, status_align,
      instructor_x, instructor_y, instructor_w, instructor_h, instructor_font_size, instructor_align,
      inst_id_x, inst_id_y, inst_id_w, inst_id_h, inst_id_font_size, inst_id_align
    ) VALUES (
      p_user_id, p_name, p_pdf_url,
      p_name_x, p_name_y, p_name_y2, p_name_w, p_name_h, p_name_font_size, p_name_align, p_name_line_spacing,
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
