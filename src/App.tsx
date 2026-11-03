import { AnimatePresence, motion } from "motion/react";
import { Camera, FolderOpen, Github, RotateCcw, ScanLine } from "lucide-react";
import { useRef, useState } from "react";
import { Adicionar } from "@/components/Adicionar";
import { CameraSheet } from "@/components/CameraSheet";
import { Editor } from "@/components/Editor";
import { Exportar } from "@/components/Exportar";
import { Paginas } from "@/components/Paginas";
import { Botao } from "@/components/ui/base";
import { useFolha } from "@/lib/estado";

function Marca() {
  return (
    <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#16150f" />
      <path d="M11 7h8l4 4v14H11z" fill="#f5f1e6" />
      <path d="M19 7v4h4" fill="none" stroke="#16150f" strokeWidth="1.2" />
      <path d="M14 17h6M14 20.5h6" stroke="#0f6b57" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function App() {
  const { fotos, atual, selecionar, adicionarArquivos, adicionarBitmap, remover, mover, atualizar, limpar } = useFolha();
  const [camera, setCamera] = useState(false);
  const entradaRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1180px] items-center gap-3 px-4 lg:px-6">
          <a href="./" className="flex items-center gap-2.5">
            <Marca />
            <span className="text-[16px] font-semibold tracking-[-0.02em]">folha</span>
          </a>
          <span className="ml-1 hidden text-[12px] text-muted-foreground sm:inline">foto de documento vira PDF</span>

          <div className="ml-auto flex items-center gap-2">
            {fotos.length > 0 ? (
              <>
                <Botao variante="fantasma" onClick={() => setCamera(true)} aria-label="Usar câmera">
                  <Camera className="size-4" strokeWidth={1.8} />
                  <span className="hidden sm:inline">Câmera</span>
                </Botao>
                <Botao variante="fantasma" onClick={() => entradaRef.current?.click()} aria-label="Escolher fotos">
                  <FolderOpen className="size-4" strokeWidth={1.8} />
                  <span className="hidden sm:inline">Fotos</span>
                </Botao>
              </>
            ) : null}
            {fotos.length > 0 ? (
              <Botao
                onClick={() => {
                  if (window.confirm("Descartar as páginas deste documento?")) limpar();
                }}
                aria-label="Novo documento"
              >
                <RotateCcw className="size-4" strokeWidth={1.8} />
                <span className="hidden sm:inline">Novo</span>
              </Botao>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-4 py-7 pb-16 lg:px-6">
        <AnimatePresence mode="wait" initial={false}>
          {fotos.length === 0 ? (
            <motion.div
              key="vazio"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="grid gap-6"
            >
              <div className="grid gap-2 pt-2">
                <span className="flex w-fit items-center gap-1.5 rounded-full bg-marca-fundo px-2.5 py-1 text-[11.5px] font-medium text-marca">
                  <ScanLine className="size-3.5" />
                  correção de perspectiva
                </span>
                <h1 className="max-w-[560px] text-[32px] leading-[1.1] font-semibold tracking-[-0.035em] lg:text-[38px]">
                  A foto sai torta.
                  <br />O PDF sai reto.
                </h1>
                <p className="max-w-[520px] text-[14px] text-muted-foreground">
                  Ajuste os quatro cantos da folha, escolha o realce e junte quantas páginas quiser. O arquivo é montado no seu navegador, sem
                  upload e sem conta.
                </p>
              </div>
              <Adicionar aoEscolherArquivos={(arquivos) => void adicionarArquivos(arquivos)} aoAbrirCamera={() => setCamera(true)} />
            </motion.div>
          ) : (
            <motion.div
              key="documento"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="grid gap-4"
            >
              <Paginas
                fotos={fotos}
                selecionada={atual?.id ?? null}
                aoSelecionar={selecionar}
                aoRemover={remover}
                aoMover={mover}
                aoAdicionar={() => entradaRef.current?.click()}
              />
              {atual ? <Editor foto={atual} aoAtualizar={atualizar} /> : null}
              <Exportar fotos={fotos} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-2 px-4 pb-10 text-[11.5px] text-muted-foreground lg:px-6">
        <span>nenhuma imagem sai deste navegador</span>
        <a href="https://github.com/eurobertlogan/folha" className="inline-flex items-center gap-1.5 hover:text-foreground">
          <Github className="size-3.5" />
          código aberto · MIT
        </a>
      </footer>

      <input
        ref={entradaRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(evento) => {
          const arquivos = Array.from(evento.target.files ?? []);
          if (arquivos.length) void adicionarArquivos(arquivos);
          evento.target.value = "";
        }}
      />

      <CameraSheet
        aberto={camera}
        aoFechar={() => setCamera(false)}
        aoCapturar={(bitmap) => {
          adicionarBitmap(bitmap, `foto-${fotos.length + 1}`);
        }}
      />
    </div>
  );
}
