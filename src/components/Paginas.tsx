import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Card } from "@/components/motion/card";
import { Tooltip } from "@/components/motion/tooltip";
import { renderizar, type Foto } from "@/lib/estado";
import { cn } from "@/lib/utils";

interface PaginasProps {
  fotos: Foto[];
  selecionada: string | null;
  aoSelecionar: (id: string) => void;
  aoRemover: (id: string) => void;
  aoMover: (id: string, direcao: -1 | 1) => void;
  aoAdicionar: () => void;
}

function Miniatura({ foto }: { foto: Foto }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const timer = setTimeout(() => {
      try {
        const canvas = renderizar(foto, 260);
        if (ativo) setUrl(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        if (ativo) setUrl(null);
      }
    }, 60);
    return () => {
      ativo = false;
      clearTimeout(timer);
    };
  }, [foto]);

  return url ? <img src={url} alt="" className="size-full object-cover" /> : <span className="text-[10px] text-muted-foreground">...</span>;
}

export function Paginas({ fotos, selecionada, aoSelecionar, aoRemover, aoMover, aoAdicionar }: PaginasProps) {
  return (
    <Card className="bg-card">
      <div className="flex items-stretch gap-2 overflow-x-auto p-3">
        {fotos.map((foto, indice) => (
          <div key={foto.id} className="group relative shrink-0">
            <button
              type="button"
              onClick={() => aoSelecionar(foto.id)}
              className={cn(
                "relative block h-[92px] w-[70px] overflow-hidden rounded-lg border bg-secondary/50 transition-all",
                selecionada === foto.id ? "border-marca ring-2 ring-marca/25" : "border-border hover:border-border-strong",
              )}
              aria-label={`Página ${indice + 1}`}
            >
              <Miniatura foto={foto} />
              <span className="absolute bottom-1 left-1 grid size-4 place-items-center rounded bg-black/55 text-[9px] font-medium text-white">
                {indice + 1}
              </span>
            </button>

            <div className="absolute -top-1.5 -right-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                onClick={() => aoMover(foto.id, -1)}
                className="grid size-5 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
                aria-label="Mover para a esquerda"
              >
                <ChevronLeft className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => aoMover(foto.id, 1)}
                className="grid size-5 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground"
                aria-label="Mover para a direita"
              >
                <ChevronRight className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => aoRemover(foto.id)}
                className="grid size-5 place-items-center rounded-full border border-border bg-card text-muted-foreground hover:text-destructive"
                aria-label="Remover página"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>
        ))}

        <Tooltip content="Adicionar outra foto ou página" side="top">
          <button
            type="button"
            onClick={aoAdicionar}
            className="grid h-[92px] w-[70px] shrink-0 place-items-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
            aria-label="Adicionar página"
          >
            <Plus className="size-5" strokeWidth={1.7} />
          </button>
        </Tooltip>
      </div>
    </Card>
  );
}
