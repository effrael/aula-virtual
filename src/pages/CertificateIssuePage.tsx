import { useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Award,
  Send,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { generateCertificatePDF } from "@/lib/certificateGenerator";

const WEBHOOK_EMAIL = import.meta.env.VITE_WEBHOOK_EMAIL as string;

// ── Types ─────────────────────────────────────────────────────────────────────
type Mode = "individual" | "csv";

interface CSVRow {
  apellidos: string;
  nombres: string;
  dni: string;
  correo: string;
  status: string;
  instructor: string;
  inst_id: string;
}

interface FailedEntry {
  email: string;
  name: string;
}

// ── CSV parser ────────────────────────────────────────────────────────────────
const HEADER_MAP: Record<string, keyof CSVRow> = {
  apellidos: "apellidos",
  nombres: "nombres",
  dni: "dni",
  correo: "correo",
  status: "status",
  instructor: "instructor",
  "inst. id": "inst_id",
  inst_id: "inst_id",
  "inst id": "inst_id",
  instid: "inst_id",
};

function parseCSV(text: string): { rows: CSVRow[]; missingHeaders: string[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { rows: [], missingHeaders: [] };

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const rawHeaders = lines[0]
    .split(delimiter)
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

  const indices: Partial<Record<keyof CSVRow, number>> = {};
  rawHeaders.forEach((h, i) => {
    const key = HEADER_MAP[h];
    if (key) indices[key] = i;
  });

  const required: (keyof CSVRow)[] = ["apellidos", "nombres", "dni", "correo"];
  const missingHeaders = required.filter((k) => indices[k] === undefined);

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]
      .split(delimiter)
      .map((c) => c.trim().replace(/^"|"$/g, ""));
    if (cols.every((c) => !c)) continue;
    rows.push({
      apellidos:
        indices.apellidos !== undefined ? (cols[indices.apellidos] ?? "") : "",
      nombres:
        indices.nombres !== undefined ? (cols[indices.nombres] ?? "") : "",
      dni: indices.dni !== undefined ? (cols[indices.dni] ?? "") : "",
      correo: indices.correo !== undefined ? (cols[indices.correo] ?? "") : "",
      status: indices.status !== undefined ? (cols[indices.status] ?? "") : "",
      instructor:
        indices.instructor !== undefined
          ? (cols[indices.instructor] ?? "")
          : "",
      inst_id:
        indices.inst_id !== undefined ? (cols[indices.inst_id] ?? "") : "",
    });
  }
  return { rows, missingHeaders };
}

// ── Certificate code helpers ──────────────────────────────────────────────────
function currentYY() {
  return String(new Date().getFullYear() % 100).padStart(2, "0");
}
function formatCode(num: number) {
  return `RC-${String(num).padStart(4, "0")}-${currentYY()}`;
}
async function getNextCodeNumber(): Promise<number> {
  const yy = currentYY();
  const { data } = await supabase
    .schema("chatbot_redcuore")
    .from("certificates")
    .select("cert_code")
    .ilike("cert_code", `RC-%-${yy}`);

  const max = (data ?? []).reduce((m, row) => {
    const match = String(row.cert_code ?? "").match(/^RC-(\d+)-\d+$/);
    return match ? Math.max(m, parseInt(match[1], 10)) : m;
  }, 0);
  return max + 1;
}

// ── Build positions object from template ──────────────────────────────────────
function buildPositions(t: any) {
  return {
    name_x: t.name_x,
    name_y: t.name_y,
    name_w: t.name_w ?? 400,
    name_h: t.name_h ?? 50,
    name_font_size: t.name_font_size,
    name_align: t.name_align ?? "center",
    apellido_x: t.apellido_x ?? 97,
    apellido_y: t.apellido_y ?? 440,
    apellido_w: t.apellido_w ?? 400,
    apellido_h: t.apellido_h ?? 50,
    apellido_font_size: t.apellido_font_size ?? 22,
    apellido_align: t.apellido_align ?? "center",
    dni_x: t.dni_x,
    dni_y: t.dni_y,
    dni_w: t.dni_w ?? 300,
    dni_h: t.dni_h ?? 30,
    dni_font_size: t.dni_font_size,
    dni_align: t.dni_align ?? "center",
    dni_line_spacing: t.dni_line_spacing ?? 1.2,
    qr_x: t.qr_x,
    qr_y: t.qr_y,
    qr_size: t.qr_size,
    code_x: t.code_x ?? 147,
    code_y: t.code_y ?? 600,
    code_w: t.code_w ?? 300,
    code_font_size: t.code_font_size ?? 16,
    code_align: t.code_align ?? "center",
    status_x: t.status_x ?? 147,
    status_y: t.status_y ?? 520,
    status_w: t.status_w ?? 300,
    status_font_size: t.status_font_size ?? 16,
    status_align: t.status_align ?? "center",
    instructor_x: t.instructor_x ?? 147,
    instructor_y: t.instructor_y ?? 440,
    instructor_w: t.instructor_w ?? 300,
    instructor_font_size: t.instructor_font_size ?? 16,
    instructor_align: t.instructor_align ?? "center",
    inst_id_x: t.inst_id_x ?? 147,
    inst_id_y: t.inst_id_y ?? 360,
    inst_id_w: t.inst_id_w ?? 300,
    inst_id_font_size: t.inst_id_font_size ?? 16,
    inst_id_align: t.inst_id_align ?? "center",
  };
}

// ── Send one certificate (returns true = success, false = failed) ─────────────
async function sendCertificate(params: {
  templateId: string;
  userId: string;
  template: any;
  recipientNombre: string;
  recipientApellido: string;
  dni: string;
  correo: string;
  certCode: string;
  status: string;
  instructor: string;
  instId: string;
}): Promise<boolean> {
  const { data: cert, error } = await supabase
    .schema("chatbot_redcuore")
    .from("certificates")
    .insert({
      template_id: params.templateId,
      recipient_name: params.recipientNombre,
      recipient_apellido: params.recipientApellido,
      dni: params.dni,
      user_id: params.userId,
      cert_code: params.certCode,
      status: params.status,
      instructor: params.instructor,
      inst_id: params.instId,
    } as any)
    .select()
    .single();

  if (error) throw error;

  const pdfBytes = await generateCertificatePDF(
    params.template.pdf_url,
    buildPositions(params.template),
    params.recipientNombre,
    params.recipientApellido,
    params.dni,
    cert.id,
    {
      code: params.certCode,
      status: params.status,
      instructor: params.instructor,
      inst_id: params.instId,
    },
  );

  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const formData = new FormData();
  formData.append("file", blob, `certificado-${params.dni}.pdf`);
  formData.append("certificate_id", cert.id);
  formData.append("template_id", params.templateId);
  formData.append("recipient_nombre", params.recipientNombre);
  formData.append("recipient_apellido", params.recipientApellido);
  formData.append("correo", params.correo);
  formData.append("dni", params.dni);
  formData.append("cert_code", params.certCode);
  formData.append("status", params.status);
  formData.append("instructor", params.instructor);
  formData.append("inst_id", params.instId);

  const res = await fetch(WEBHOOK_EMAIL, { method: "POST", body: formData });
  const json = await res.json().catch(() => ({ dataresponse: false }));
  return json.dataresponse === true;
}

// ── Page ──────────────────────────────────────────────────────────────────────
const CertificateIssuePage = () => {
  const { templateId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Mode
  const [mode, setMode] = useState<Mode>("individual");

  // Individual form
  const [recipientNombre, setRecipientNombre] = useState("");
  const [recipientApellido, setRecipientApellido] = useState("");
  const [dni, setDni] = useState("");
  const [correo, setCorreo] = useState("");
  const [status, setStatus] = useState("");
  const [instructor, setInstructor] = useState("");
  const [instId, setInstId] = useState("");
  const [generating, setGenerating] = useState(false);

  // CSV state
  const [csvRows, setCsvRows] = useState<CSVRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [failedEntries, setFailedEntries] = useState<FailedEntry[]>([]);
  const [doneCount, setDoneCount] = useState(0);

  const { data: template, isLoading } = useQuery({
    queryKey: ["certificate_template", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("chatbot_redcuore")
        .from("certificate_templates")
        .select("*")
        .eq("id", templateId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // ── Individual submit ────────────────────────────────────────────────────────
  const handleIndividualIssue = async () => {
    if (!recipientNombre.trim() || !recipientApellido.trim() || !dni.trim() || !correo.trim()) {
      toast.error("Completa nombres, apellidos, DNI y correo antes de generar");
      return;
    }
    if (!template) return;
    setGenerating(true);
    try {
      const code = formatCode(await getNextCodeNumber());
      const ok = await sendCertificate({
        templateId: templateId!,
        userId: user!.id,
        template,
        recipientNombre: recipientNombre.trim(),
        recipientApellido: recipientApellido.trim(),
        dni: dni.trim(),
        correo: correo.trim(),
        certCode: code,
        status: status.trim(),
        instructor: instructor.trim(),
        instId: instId.trim(),
      });

      queryClient.invalidateQueries({ queryKey: ["certificates"] });

      if (ok) {
        toast.success("Certificado generado y enviado correctamente");
        setRecipientNombre("");
        setRecipientApellido("");
        setDni("");
        setCorreo("");
        setStatus("");
        setInstructor("");
        setInstId("");
      } else {
        toast.warning(
          `Certificado generado pero el webhook reportó fallo para ${correo.trim()}`,
        );
      }
    } catch (err: any) {
      toast.error(err.message ?? "Error al generar el certificado");
    } finally {
      setGenerating(false);
    }
  };

  // ── CSV load ─────────────────────────────────────────────────────────────────
  const handleCSVLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer;
      // Try UTF-8 first; if replacement chars appear the file is Windows-1252 (Excel default)
      let text = new TextDecoder("utf-8").decode(buffer);
      if (text.includes("\uFFFD")) {
        text = new TextDecoder("windows-1252").decode(buffer);
      }
      const { rows, missingHeaders } = parseCSV(text);
      if (missingHeaders.length > 0) {
        setCsvError(
          `Columnas requeridas no encontradas: ${missingHeaders.join(", ").toUpperCase()}`,
        );
        setCsvRows([]);
      } else if (rows.length === 0) {
        setCsvError("El archivo CSV no contiene datos");
        setCsvRows([]);
      } else {
        setCsvError(null);
        setCsvRows(rows);
        setFailedEntries([]);
        setDoneCount(0);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  // ── CSV batch process ────────────────────────────────────────────────────────
  const handleCSVIssue = async () => {
    if (csvRows.length === 0 || !template) return;
    setProcessing(true);
    setFailedEntries([]);
    setProcessedCount(0);
    setDoneCount(0);

    let nextNum = await getNextCodeNumber();
    const failed: FailedEntry[] = [];

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const displayName = `${row.nombres} ${row.apellidos}`.trim();
      const code = formatCode(nextNum++);
      try {
        const ok = await sendCertificate({
          templateId: templateId!,
          userId: user!.id,
          template,
          recipientNombre: row.nombres,
          recipientApellido: row.apellidos,
          dni: row.dni,
          correo: row.correo,
          certCode: code,
          status: row.status,
          instructor: row.instructor,
          instId: row.inst_id,
        });
        if (!ok) failed.push({ email: row.correo, name: displayName });
      } catch {
        failed.push({ email: row.correo, name });
      }
      setProcessedCount(i + 1);
    }

    setFailedEntries(failed);
    setDoneCount(csvRows.length);
    setProcessing(false);
    queryClient.invalidateQueries({ queryKey: ["certificates"] });

    if (failed.length === 0) {
      toast.success(`${csvRows.length} certificados enviados correctamente`);
    } else {
      toast.warning(
        `${csvRows.length - failed.length} enviados · ${failed.length} con fallo`,
      );
    }
  };

  const progress =
    csvRows.length > 0
      ? Math.round((processedCount / csvRows.length) * 100)
      : 0;

  return (
    <AdminLayout>
      <div className="max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/certificaciones">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Emitir Certificado</h1>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground py-8 text-center">
            Cargando plantilla...
          </p>
        ) : !template ? (
          <p className="text-muted-foreground py-8 text-center">
            Plantilla no encontrada
          </p>
        ) : (
          <>
            {/* Template badge */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Usando plantilla
                  </p>
                  <p className="font-semibold">{template.name}</p>
                </div>
              </CardContent>
            </Card>

            {/* Mode toggle */}
            <div className="flex rounded-lg border overflow-hidden text-sm font-medium">
              {(["individual", "csv"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 transition-colors ${
                    mode === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {m === "individual" ? "Individual" : "Carga CSV"}
                </button>
              ))}
            </div>

            {/* ── INDIVIDUAL MODE ── */}
            {mode === "individual" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Hoja delantera</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Nombres</Label>
                      <Input
                        value={recipientNombre}
                        onChange={(e) => setRecipientNombre(e.target.value)}
                        placeholder="Juan Alejandro"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Apellidos</Label>
                      <Input
                        value={recipientApellido}
                        onChange={(e) => setRecipientApellido(e.target.value)}
                        placeholder="García López"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>DNI</Label>
                      <Input
                        value={dni}
                        onChange={(e) => setDni(e.target.value)}
                        placeholder="12345678A"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Correo electrónico</Label>
                      <Input
                        type="email"
                        value={correo}
                        onChange={(e) => setCorreo(e.target.value)}
                        placeholder="alumno@ejemplo.com"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Hoja trasera</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>ESTATUS</Label>
                      <Input
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        placeholder="ACTIVO"
                      />
                    </div>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label>INSTRUCTOR</Label>
                      <Input
                        value={instructor}
                        onChange={(e) => setInstructor(e.target.value)}
                        placeholder="Nombre del instructor"
                      />
                    </div>
                    <Separator />
                    <div className="space-y-1.5">
                      <Label>Inst. ID</Label>
                      <Input
                        value={instId}
                        onChange={(e) => setInstId(e.target.value)}
                        placeholder="ID del instructor"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleIndividualIssue}
                  disabled={generating}
                  className="w-full"
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {generating
                    ? "Generando y enviando..."
                    : "Generar y Enviar Certificado"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  El PDF se enviará al webhook · Incluye QR de verificación
                </p>
              </>
            )}

            {/* ── CSV MODE ── */}
            {mode === "csv" && (
              <>
                {/* Upload area */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Cargar alumnos desde CSV
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      Columnas requeridas:{" "}
                      <span className="font-mono">
                        APELLIDOS · NOMBRES · DNI · CORREO
                      </span>
                      <br />
                      Opcionales:{" "}
                      <span className="font-mono">
                        STATUS · INSTRUCTOR · INST. ID
                      </span>
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div
                      className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => csvInputRef.current?.click()}
                    >
                      <Upload className="h-7 w-7 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {csvRows.length > 0
                          ? `${csvRows.length} alumnos cargados · Clic para reemplazar`
                          : "Clic para seleccionar el CSV"}
                      </p>
                    </div>
                    <input
                      ref={csvInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={handleCSVLoad}
                    />

                    {csvError && (
                      <div className="mt-3 flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        {csvError}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Preview table */}
                {csvRows.length > 0 && (
                  <Card className="p-4">
                    <CardHeader>
                      <CardTitle className="text-base">
                        Vista previa — {csvRows.length} alumnos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              {[
                                "#",
                                "Código",
                                "Nombres",
                                "Apellidos",
                                "DNI",
                                "Correo",
                                "Status",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvRows.slice(0, 8).map((row, i) => (
                              <tr
                                key={i}
                                className="border-b last:border-0 hover:bg-muted/30"
                              >
                                <td className="px-3 py-2 text-muted-foreground">
                                  {i + 1}
                                </td>
                                <td className="px-3 py-2 font-mono text-muted-foreground">
                                  RC-{String(i + 1).padStart(4, "0")}-
                                  {currentYY()}
                                </td>
                                <td className="px-3 py-2">{row.nombres}</td>
                                <td className="px-3 py-2">{row.apellidos}</td>
                                <td className="px-3 py-2">{row.dni}</td>
                                <td className="px-3 py-2 max-w-[140px] truncate">
                                  {row.correo}
                                </td>
                                <td className="px-3 py-2">{row.status}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {csvRows.length > 8 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            … y {csvRows.length - 8} registros más
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Progress */}
                {processing && (
                  <Card>
                    <CardContent className="py-5 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Procesando {processedCount} de {csvRows.length}…
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Done summary */}
                {!processing && doneCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {doneCount - failedEntries.length} de {doneCount}{" "}
                    certificados enviados correctamente
                  </div>
                )}

                {/* Failed list */}
                {failedEntries.length > 0 && (
                  <Card className="border-destructive/40">
                    <CardHeader>
                      <CardTitle className="text-base text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Envíos fallidos ({failedEntries.length})
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        El certificado fue generado y guardado, pero el webhook
                        reportó fallo para estos correos.
                      </p>
                    </CardHeader>
                    <CardContent className="p-0">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                              Nombre
                            </th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">
                              Correo
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {failedEntries.map((f, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="px-3 py-2">{f.name}</td>
                              <td className="px-3 py-2 text-destructive">
                                {f.email}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                )}

                {csvRows.length > 0 && (
                  <Button
                    onClick={handleCSVIssue}
                    disabled={processing}
                    className="w-full"
                    size="lg"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Procesando {processedCount}/{csvRows.length}…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Generar y Enviar {csvRows.length} certificados
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default CertificateIssuePage;
