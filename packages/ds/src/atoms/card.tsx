import { cn } from "#lib/utils";

/**
 * A superfície elevada do produto.
 *
 * Existe como átomo porque o brilho colorido (`--glow`) é assinatura da marca
 * e não pode ser recriado na mão em cada tela — foi assim que o projeto
 * acabou com dez variações de sombra antes do DS.
 */
export function Card({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "rounded-[var(--radius-card)] border border-hairline bg-raised shadow-[var(--glow)]",
        className,
      )}
      {...props}
    />
  );
}
