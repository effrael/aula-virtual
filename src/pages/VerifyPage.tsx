import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle,
  XCircle,
  Award,
  ShieldCheck,
  Loader2,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { generateCertificatePDF } from "@/lib/certificateGenerator";

const ISSUER_TEXT =
  "Certificado válido emitido por Red Cuore — RUC: 20615177530";

const VerifyPage = () => {
  const { id } = useParams();
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const {
    data: cert,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["verify_certificate", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("chatbot_redcuore")
        .from("certificates")
        .select("*, certificate_templates(*)")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  // Generate PDF preview once cert + template data is available
  useEffect(() => {
    if (!cert) return;
    const tpl = (cert as any).certificate_templates;
    if (!tpl?.pdf_url) return;

    let objectUrl: string;
    setGeneratingPdf(true);

    generateCertificatePDF(
      tpl.pdf_url,
      {
        name_x: tpl.name_x,
        name_y: tpl.name_y,
        name_w: tpl.name_w ?? 400,
        name_h: tpl.name_h ?? 50,
        name_font_size: tpl.name_font_size,
        name_align: tpl.name_align ?? "center",
        apellido_x: tpl.apellido_x ?? 97,
        apellido_y: tpl.apellido_y ?? 440,
        apellido_w: tpl.apellido_w ?? 400,
        apellido_h: tpl.apellido_h ?? 50,
        apellido_font_size: tpl.apellido_font_size ?? 22,
        apellido_align: tpl.apellido_align ?? "center",
        dni_x: tpl.dni_x,
        dni_y: tpl.dni_y,
        dni_w: tpl.dni_w ?? 300,
        dni_h: tpl.dni_h ?? 30,
        dni_font_size: tpl.dni_font_size,
        dni_align: tpl.dni_align ?? "center",
        dni_line_spacing: tpl.dni_line_spacing ?? 1.2,
        qr_x: tpl.qr_x,
        qr_y: tpl.qr_y,
        qr_size: tpl.qr_size,
        code_x: tpl.code_x ?? 147,
        code_y: tpl.code_y ?? 600,
        code_w: tpl.code_w ?? 300,
        code_font_size: tpl.code_font_size ?? 16,
        code_align: tpl.code_align ?? "center",
        status_x: tpl.status_x ?? 147,
        status_y: tpl.status_y ?? 520,
        status_w: tpl.status_w ?? 300,
        status_font_size: tpl.status_font_size ?? 16,
        status_align: tpl.status_align ?? "center",
        instructor_x: tpl.instructor_x ?? 147,
        instructor_y: tpl.instructor_y ?? 440,
        instructor_w: tpl.instructor_w ?? 300,
        instructor_font_size: tpl.instructor_font_size ?? 16,
        instructor_align: tpl.instructor_align ?? "center",
        inst_id_x: tpl.inst_id_x ?? 147,
        inst_id_y: tpl.inst_id_y ?? 360,
        inst_id_w: tpl.inst_id_w ?? 300,
        inst_id_font_size: tpl.inst_id_font_size ?? 16,
        inst_id_align: tpl.inst_id_align ?? "center",
      },
      cert.recipient_name,
      (cert as any).recipient_apellido ?? "",
      cert.dni,
      cert.id,
      {
        code: (cert as any).cert_code ?? "",
        status: (cert as any).status ?? "",
        instructor: (cert as any).instructor ?? "",
        inst_id: (cert as any).inst_id ?? "",
      },
    )
      .then((bytes) => {
        objectUrl = URL.createObjectURL(
          new Blob([bytes], { type: "application/pdf" }),
        );
        setPdfBlobUrl(objectUrl);
      })
      .catch(() => {
        /* silently ignore — iframe just won't show */
      })
      .finally(() => setGeneratingPdf(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cert]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start p-4 py-10">
      <div className="w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-lg font-bold">Verificación de Certificado</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Comprobación de autenticidad del documento
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Verificando...
            </CardContent>
          </Card>
        )}

        {/* Invalid */}
        {!isLoading && (isError || !cert) && (
          <Card className="border-destructive/40 max-w-sm mx-auto">
            <CardContent className="py-10 text-center space-y-2">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="font-semibold text-destructive">
                Certificado no válido
              </p>
              <p className="text-sm text-muted-foreground">
                No se encontró este certificado en el sistema o ha sido
                eliminado.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Valid */}
        {!isLoading && cert && (
          <>
            {/* Issuer badge */}
            <div className="flex items-center justify-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 max-w-sm mx-auto">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">{ISSUER_TEXT}</span>
            </div>

            {/* Two-column layout: details | PDF */}
            <div className="grid grid-cols-1 gap-6 justify-center items-center">
              {/* Details card */}
              <Card className="border-green-500/40 max-w-md mx-auto">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-600 text-base">
                    <CheckCircle className="h-5 w-5" />
                    Certificado Válido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <Field label="Nombres" value={cert.recipient_name} large />
                  <Field label="Apellidos" value={(cert as any).recipient_apellido} large />
                  <Field label="DNI" value={cert.dni} />

                  {(cert as any).cert_code && (
                    <Field
                      label="Código"
                      value={(cert as any).cert_code}
                      mono
                    />
                  )}

                  {(cert as any).certificate_templates?.name && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Certificación
                      </p>
                      <p className="font-medium mt-0.5 flex items-center gap-1.5">
                        <Award className="h-4 w-4 text-primary shrink-0" />
                        {(cert as any).certificate_templates.name}
                      </p>
                    </div>
                  )}

                  <Field label="Estatus" value={(cert as any).status} />
                  <Field label="Instructor" value={(cert as any).instructor} />
                  <Field label="Inst. ID" value={(cert as any).inst_id} />

                  <Field
                    label="Fecha de emisión"
                    value={format(
                      new Date(cert.issued_at),
                      "d 'de' MMMM 'de' yyyy",
                      { locale: es },
                    )}
                  />

                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      ID del certificado
                    </p>
                    <p className="text-xs font-mono text-muted-foreground break-all mt-0.5">
                      {cert.id}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* PDF iframe */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2 border-b">
                  <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground font-medium">
                    <FileText className="h-4 w-4" />
                    Documento
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {generatingPdf && (
                    <div className="flex flex-col items-center justify-center gap-3 h-[600px] text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <p className="text-sm">Cargando documento…</p>
                    </div>
                  )}
                  {!generatingPdf && pdfBlobUrl && (
                    <iframe
                      src={pdfBlobUrl}
                      title="Certificado"
                      className="w-full border-0"
                      style={{ height: "700px" }}
                    />
                  )}
                  {!generatingPdf && !pdfBlobUrl && (
                    <div className="flex flex-col items-center justify-center gap-2 h-[600px] text-muted-foreground">
                      <FileText className="h-8 w-8 opacity-30" />
                      <p className="text-sm">No se pudo cargar el documento</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Helper for clean field display — skips if value is empty
function Field({
  label,
  value,
  large,
  mono,
}: {
  label: string;
  value?: string | null;
  large?: boolean;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p
        className={`mt-0.5 ${large ? "font-bold text-xl" : "font-medium"} ${mono ? "font-mono text-sm" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

export default VerifyPage;
