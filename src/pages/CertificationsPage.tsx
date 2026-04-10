import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Award, ExternalLink, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { generateCertificatePDF } from '@/lib/certificateGenerator';

const CertificationsPage = () => {
  const queryClient = useQueryClient();
  const [viewingId, setViewingId] = useState<string | null>(null);

  async function handleView(cert: any) {
    setViewingId(cert.id);
    try {
      const { data: tpl, error } = await supabase
        .schema('chatbot_redcuore')
        .from('certificate_templates')
        .select('*')
        .eq('id', cert.template_id)
        .single();
      if (error || !tpl) throw new Error('No se encontró la plantilla');

      const pos = {
        name_x: tpl.name_x, name_y: tpl.name_y,
        name_w: tpl.name_w ?? 400, name_h: tpl.name_h ?? 50,
        name_font_size: tpl.name_font_size,
        name_align: (tpl.name_align ?? 'center') as any,
        apellido_x: (tpl as any).apellido_x ?? 97, apellido_y: (tpl as any).apellido_y ?? 440,
        apellido_w: (tpl as any).apellido_w ?? 400, apellido_h: (tpl as any).apellido_h ?? 50,
        apellido_font_size: (tpl as any).apellido_font_size ?? 22,
        apellido_align: ((tpl as any).apellido_align ?? 'center') as any,
        dni_x: tpl.dni_x, dni_y: tpl.dni_y,
        dni_w: tpl.dni_w ?? 300, dni_h: tpl.dni_h ?? 30,
        dni_font_size: tpl.dni_font_size,
        dni_align: (tpl.dni_align ?? 'center') as any,
        dni_line_spacing: tpl.dni_line_spacing ?? 1.2,
        qr_x: tpl.qr_x, qr_y: tpl.qr_y, qr_size: tpl.qr_size,
        code_x: (tpl as any).code_x ?? 147,       code_y: (tpl as any).code_y ?? 600,
        code_w: (tpl as any).code_w ?? 300,        code_font_size: (tpl as any).code_font_size ?? 16,
        code_align: ((tpl as any).code_align ?? 'center') as any,
        status_x: (tpl as any).status_x ?? 147,   status_y: (tpl as any).status_y ?? 520,
        status_w: (tpl as any).status_w ?? 300,    status_font_size: (tpl as any).status_font_size ?? 16,
        status_align: ((tpl as any).status_align ?? 'center') as any,
        instructor_x: (tpl as any).instructor_x ?? 147, instructor_y: (tpl as any).instructor_y ?? 440,
        instructor_w: (tpl as any).instructor_w ?? 300,  instructor_font_size: (tpl as any).instructor_font_size ?? 16,
        instructor_align: ((tpl as any).instructor_align ?? 'center') as any,
        inst_id_x: (tpl as any).inst_id_x ?? 147, inst_id_y: (tpl as any).inst_id_y ?? 360,
        inst_id_w: (tpl as any).inst_id_w ?? 300,  inst_id_font_size: (tpl as any).inst_id_font_size ?? 16,
        inst_id_align: ((tpl as any).inst_id_align ?? 'center') as any,
      };

      const pdfBytes = await generateCertificatePDF(
        tpl.pdf_url, pos,
        cert.recipient_name, (cert as any).recipient_apellido ?? '', cert.dni, cert.id,
        {
          code:       (cert as any).cert_code  ?? '',
          status:     (cert as any).status     ?? '',
          instructor: (cert as any).instructor ?? '',
          inst_id:    (cert as any).inst_id    ?? '',
        }
      );

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err: any) {
      toast.error(err.message ?? 'Error al generar la vista previa');
    } finally {
      setViewingId(null);
    }
  }

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['certificate_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('chatbot_redcuore')
        .from('certificate_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: certificates = [], isLoading: loadingCerts } = useQuery({
    queryKey: ['certificates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .schema('chatbot_redcuore')
        .from('certificates')
        .select('*, certificate_templates(name)')
        .order('issued_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .schema('chatbot_redcuore')
        .from('certificate_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificate_templates'] });
      toast.success('Plantilla eliminada');
    },
    onError: () => toast.error('Error al eliminar la plantilla'),
  });

  const deleteCertificate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .schema('chatbot_redcuore')
        .from('certificates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      toast.success('Certificado eliminado');
    },
    onError: () => toast.error('Error al eliminar el certificado'),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Certificaciones</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gestiona plantillas y certificados emitidos
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/certificaciones/plantilla/nuevo">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Plantilla
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="plantillas">
          <TabsList>
            <TabsTrigger value="plantillas">
              Plantillas
              {templates.length > 0 && (
                <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {templates.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="emitidos">
              Certificados Emitidos
              {certificates.length > 0 && (
                <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {certificates.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* PLANTILLAS TAB */}
          <TabsContent value="plantillas" className="mt-4">
            {loadingTemplates ? (
              <div className="text-center py-12 text-muted-foreground">Cargando...</div>
            ) : templates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                  <Award className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground font-medium">No hay plantillas aún</p>
                  <p className="text-sm text-muted-foreground">
                    Crea una plantilla subiendo tu PDF base
                  </p>
                  <Button asChild size="sm" className="mt-1">
                    <Link to="/admin/certificaciones/plantilla/nuevo">
                      <Plus className="h-4 w-4 mr-1" />
                      Crear primera plantilla
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {templates.map((template: any) => (
                  <Card key={template.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Award className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Creada el{' '}
                            {format(new Date(template.created_at), "d 'de' MMMM yyyy", {
                              locale: es,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button asChild size="sm">
                          <Link to={`/admin/certificaciones/emitir/${template.id}`}>
                            <Award className="h-4 w-4 mr-1" />
                            Emitir
                          </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/admin/certificaciones/plantilla/${template.id}`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar plantilla?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Los certificados ya emitidos no
                                serán eliminados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteTemplate.mutate(template.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* EMITIDOS TAB */}
          <TabsContent value="emitidos" className="mt-4">
            {loadingCerts ? (
              <div className="text-center py-12 text-muted-foreground">Cargando...</div>
            ) : certificates.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                  <Award className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-muted-foreground font-medium">No hay certificados emitidos aún</p>
                  <p className="text-sm text-muted-foreground">
                    Usa una plantilla para emitir tu primer certificado
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Destinatario</th>
                      <th className="px-4 py-3 text-left font-medium">DNI</th>
                      <th className="px-4 py-3 text-left font-medium">Código</th>
                      <th className="px-4 py-3 text-left font-medium">Plantilla</th>
                      <th className="px-4 py-3 text-left font-medium">Emitido</th>
                      <th className="px-4 py-3 text-left font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certificates.map((cert: any) => (
                      <tr key={cert.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{cert.recipient_name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{cert.dni}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {(cert as any).cert_code || '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {cert.certificate_templates?.name ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {format(new Date(cert.issued_at), 'd MMM yyyy', { locale: es })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm"
                              disabled={viewingId === cert.id}
                              onClick={() => handleView(cert)}>
                              {viewingId === cert.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Eye className="h-3.5 w-3.5" />}
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/verify/${cert.id}`} target="_blank">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar certificado?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    El QR de este certificado dejará de ser válido al escanearlo.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteCertificate.mutate(cert.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default CertificationsPage;
