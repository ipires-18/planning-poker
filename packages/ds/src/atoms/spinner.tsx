import { cn } from "#lib/utils";

const DOTS = ["bg-brand-400", "bg-punch", "bg-zest"];

/**
 * Três bolinhas subindo em sequência.
 *
 * Não é um spinner de biblioteca de propósito: o produto é lúdico, e um círculo
 * girando cinza destoaria de tudo ao redor. O atraso de cada bolinha é a única
 * coisa que sai de classe, porque são três valores distintos e fixos.
 */
export function Spinner({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center gap-4", className)}
      role="status"
    >
      <div className="flex gap-1.5" aria-hidden>
        {DOTS.map((tone, i) => (
          <span
            key={tone}
            className={cn(
              "size-3 rounded-full",
              "animate-[ds-bounce_0.9s_var(--ease-out-soft)_infinite]",
              i === 1 && "[animation-delay:120ms]",
              i === 2 && "[animation-delay:240ms]",
              tone,
            )}
          />
        ))}
      </div>
      {label ? (
        <p className="text-body-sm font-bold text-ink-muted">{label}</p>
      ) : (
        <span className="sr-only">Carregando</span>
      )}
    </div>
  );
}
