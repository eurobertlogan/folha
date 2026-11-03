import { Camera, ImagePlus, ScanLine, ShieldCheck } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, AlertContent, AlertDescription, AlertTitle } from "@/components/motion/alert";
import { Card } from "@/components/motion/card";
import { Tooltip } from "@/components/motion/tooltip";
import { Botao } from "@/components/ui/base";
import { cn } from "@/lib/utils";

interface AdicionarProps {
  aoEscolherArquivos: (arquivos: File[]) => void;
  aoAbrirCamera: () => void;
}

export function Adicionar({ aoEscolherArquivos, aoAbrirCamera }: AdicionarProps) {
  const entradaRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);

  return (
    <div className="grid gap-4">
      <Card className="bg-card">
        <div
          onDragOver={(evento) => {
            evento.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(evento) => {
            evento.preventDefault();
            setArrastando(false);
            aoEscolherArquivos(Array.from(evento.dataTransfer.files));
          }}
          className={cn(
            "grid place-items-center gap-4 px-6 py-16 text-center transition-colors",
            arrastando && "bg-marca-fundo",
          )}
        >
          <span className="grid size-14 place-items-center rounded-2xl bg-marca-fundo text-marca">
            <ScanLine className="size-7" strokeWidth={1.5} />
          </span>
          <div className="grid gap-1.5">
            <h2 className="text-[19px] font-semibold tracking-[-0.02em]">Jogue as fotos aqui</h2>
            <p className="max-w-[380px] text-[13px] text-muted-foreground">
              Uma folha por foto, de preferência com fundo escuro e sem sombra. Várias páginas de uma vez.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Botao variante="principal" tamanho="grande" onClick={() => entradaRef.current?.click()}>
              <ImagePlus className="size-4" strokeWidth={1.8} />
              Escolher fotos
            </Botao>
            <Botao tamanho="grande" onClick={aoAbrirCamera}>
              <Camera className="size-4" strokeWidth={1.8} />
              Usar câmera
            </Botao>
          </div>
          <Tooltip content="O recorte acontece no seu computador. Nenhuma imagem sai daqui." side="bottom">
            <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
              <ShieldCheck className="size-3.5" />
              nada é enviado para o servidor
            </span>
          </Tooltip>
          <input
            ref={entradaRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(evento) => {
              const arquivos = Array.from(evento.target.files ?? []);
              if (arquivos.length) aoEscolherArquivos(arquivos);
              evento.target.value = "";
            }}
          />
        </div>
      </Card>

      <Alert variant="info" defaultOpen>
        <AlertContent>
          <AlertTitle>Para ficar bom</AlertTitle>
          <AlertDescription>
            Fotografe a folha inteira, com papel de fundo contrastante, e evite flash direto. O ajuste de cantos corrige a perspectiva
            depois, mas não recupera o que ficou fora do quadro.
          </AlertDescription>
        </AlertContent>
      </Alert>
    </div>
  );
}
