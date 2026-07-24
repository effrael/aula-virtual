import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { XCircle, ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const VerifyPage = () => {
  const { id } = useParams();

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
        .select("cert_code")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    retry: false,
  });

  // Redirección automática cuando se obtiene el cert_code
  useEffect(() => {
    if (cert && (cert as any).cert_code) {
      window.location.href = `https://educa.redcuore.com/verify/${(cert as any).cert_code}`;
    }
  }, [cert]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Loading */}
      {isLoading && (
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando certificado...</p>
        </div>
      )}

      {/* Redirigiendo */}
      {!isLoading && cert && (cert as any).cert_code && (
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      )}

      {/* Sin código o error */}
      {!isLoading && (isError || !cert || !(cert as any).cert_code) && (
        <Card className="border-destructive/40 max-w-sm">
          <CardContent className="py-10 text-center space-y-2">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <p className="font-semibold text-destructive">
              Certificado no válido
            </p>
            <p className="text-sm text-muted-foreground">
              No se encontró este certificado en el sistema o ha sido eliminado.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VerifyPage;
