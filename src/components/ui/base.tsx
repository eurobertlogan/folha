import { motion, useReducedMotion } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variante = "principal" | "secundario" | "fantasma" | "perigo";

const VARIANTE: Record<Variante, string> = {
  principal: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
  secundario: "border-border bg-card text-foreground hover:bg-secondary",
  fantasma: "border-transparent bg-transparent text-muted-foreground hover:bg-secondary",
  perigo: "border-destructive/25 bg-card text-destructive hover:bg-destructive/5",
};

interface BotaoProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onAnimationStart" | "onDragStart" | "onDragEnd" | "onDrag"> {
  variante?: Variante;
  tamanho?: "padrao" | "grande" | "icone";
  children?: ReactNode;
}

export function Botao({ variante = "secundario", tamanho = "padrao", className, children, ...props }: BotaoProps) {
  const reduzir = useReducedMotion();
  return (
    <motion.button
      type="button"
      whileTap={reduzir ? undefined : { scale: 0.975 }}
      transition={{ type: "spring", stiffness: 520, damping: 32 }}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 rounded-[10px] border font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-45",
        tamanho === "padrao" && "h-9 px-3.5 text-[13px]",
        tamanho === "grande" && "h-10.5 px-5 text-[13.5px]",
        tamanho === "icone" && "size-9",
        VARIANTE[variante],
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
