import { useState } from "react";
import { Button, Initials, Progress, Select } from "@pp/ds/atoms";
import { cx } from "@/lib/cx";
import { ROLE_LABEL, ROLE_SHORT, type Player, type VotingSide } from "@/types";
import { safeUrl } from "@/lib/links";
import type {
  CapacityRow,
  PlayerSummary,
  ScoredStory,
  TeamCapacity,
} from "@/lib/derive";

interface Props {
  summaries: PlayerSummary[];
  capacity: TeamCapacity;
  /** Quem está na cerimônia sem carta — o PO e o convidado sem baralho. */
  watchers: Player[];
  online: Set<string>;
  youId: string | null;
  /** Quem criou a sala — não pode ser tirado dela. */
  ownerId: string;
  /** PO / Tech Lead: trocam quem pega a história e tiram cadeira fantasma. */
  isHost: boolean;
  onReassign: (
    storyId: string,
    side: VotingSide,
    fromId: string,
    toId: string,
  ) => Promise<void>;
  onRemove: (playerId: string) => Promise<void>;
}

/** O que só quem conduz enxerga em cada linha do placar. */
interface HostTools {
  /** Para quem a história pode ir: todo mundo que pontua. */
  scorers: Player[];
  onReassign: Props["onReassign"];
  onRemove: Props["onRemove"];
}

export function Roster({
  summaries,
  capacity,
  watchers,
  online,
  youId,
  ownerId,
  isHost,
  onReassign,
  onRemove,
}: Props) {
  const capacityByPlayer = new Map(
    capacity.rows.map((row) => [row.player.id, row]),
  );

  const tools: HostTools | null = isHost
    ? { scorers: summaries.map((s) => s.player), onReassign, onRemove }
    : null;

  // Ninguém tira a si mesmo nem quem criou a sala — a mesma regra do banco,
  // aqui só para o botão nem aparecer.
  const removable = (player: Player) =>
    player.user_id !== youId && player.user_id !== ownerId;

  return (
    <aside className="hidden w-72 shrink-0 border-r border-hairline bg-[var(--surface-raised)]/50 p-5 lg:block">
      <h2 className="mb-4 text-[10px] font-black uppercase tracking-[0.18em] text-ink-subtle">
        Placar do time
      </h2>

      {summaries.length === 0 ? (
        <p className="text-sm text-ink-subtle">Ninguém sentou à mesa ainda.</p>
      ) : (
        <ul className="space-y-3">
          {summaries.map((summary, index) => (
            <ScorerRow
              key={summary.player.id}
              summary={summary}
              rank={index + 1}
              capacity={capacityByPlayer.get(summary.player.id)}
              isOnline={online.has(summary.player.user_id)}
              isYou={summary.player.user_id === youId}
              tools={tools}
              canRemove={Boolean(tools) && removable(summary.player)}
            />
          ))}
        </ul>
      )}

      {/* Quem acompanha sem pontuar aparece aqui, e não some da sessão só por
          não carregar pontos. */}
      {watchers.length > 0 && (
        <div className="mt-6 border-t border-hairline pt-4">
          <h2 className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-ink-subtle">
            Acompanhando
          </h2>
          <ul className="space-y-2">
            {watchers.map((player) => (
              <WatcherRow
                key={player.id}
                player={player}
                isOnline={online.has(player.user_id)}
                isYou={player.user_id === youId}
                onRemove={tools && removable(player) ? onRemove : undefined}
              />
            ))}
          </ul>
        </div>
      )}

      <SprintFooter capacity={capacity} />
    </aside>
  );
}

/* -------------------------------------------------------------------------- */

function ScorerRow({
  summary,
  rank,
  capacity,
  isOnline,
  isYou,
  tools,
  canRemove,
}: {
  summary: PlayerSummary;
  rank: number;
  capacity: CapacityRow | undefined;
  isOnline: boolean;
  isYou: boolean;
  tools: HostTools | null;
  canRemove: boolean;
}) {
  const { player, total, stories } = summary;

  // O número sai do opcional uma vez, e é ele que decide se a barra aparece.
  // Um booleano `hasCapacity` solto não estreitaria `capacity` para o
  // TypeScript, e cada uso exigiria um `!`.
  const target = capacity?.capacity ?? 0;
  const occupancy = target > 0 ? total / target : null;

  const meta = [
    ROLE_SHORT[player.role],
    player.days_off > 0 ? `falta ${player.days_off}d` : null,
    isOnline ? null : "ausente",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li
      data-role={player.role}
      className={cx(
        "rounded-[var(--radius-card)] p-3 transition-colors",
        isYou ? "bg-brand-500/10" : "hover:bg-sunken",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="w-4 shrink-0 text-center font-mono text-xs font-black text-ink-subtle">
          {rank}
        </span>
        <Initials
          name={player.name}
          role={player.role}
          size="md"
          dimmed={!isOnline}
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">
            {player.name}
            {isYou && <span className="text-ink-subtle"> (você)</span>}
          </p>
          <span
            className="block truncate text-[9px] font-black uppercase tracking-[0.1em] text-(--ds-accent)"
            title={isOnline ? undefined : "Sem aba aberta agora"}
          >
            {meta}
          </span>
        </div>

        <span className="shrink-0 rounded-xl bg-[var(--surface-sunken)] px-2 py-1 text-sm font-black text-ink">
          {total}
          {target > 0 && (
            <span className="text-[10px] font-bold text-ink-subtle">
              /{target}
            </span>
          )}
        </span>
      </div>

      {occupancy !== null && (
        <OccupancyBar
          ratio={occupancy}
          label={`${total} de ${target} pontos`}
        />
      )}

      {stories.length > 0 && (
        <ul className="ml-7 mt-2 space-y-1 border-l border-hairline pl-3">
          {stories.map((story) => (
            <StoryLine
              key={`${story.storyId}-${story.side}`}
              story={story}
              owner={player}
              tools={tools}
            />
          ))}
        </ul>
      )}

      {tools && canRemove && (
        <RemoveControl
          player={player}
          // Com história no nome, sair faria o placar deixar de fechar.
          blocked={stories.length > 0 || total !== 0}
          onRemove={tools.onRemove}
        />
      )}
    </li>
  );
}

/**
 * Quanto da capacidade da pessoa já foi comprometido.
 *
 * O aviso é por cor: acima de 90% o tom vira atenção, acima de 100% vira
 * crítico — e a barra satura, porque passar do teto não deve fazer o traço
 * vazar para fora do poço.
 */
function OccupancyBar({ ratio, label }: { ratio: number; label: string }) {
  const tone = ratio > 1 ? "critical" : ratio > 0.9 ? "attention" : undefined;

  return (
    <Progress
      value={ratio * 100}
      tone={tone}
      label={label}
      size="sm"
      className="ml-7 mt-2"
    />
  );
}

function WatcherRow({
  player,
  isOnline,
  isYou,
  onRemove,
}: {
  player: Player;
  isOnline: boolean;
  isYou: boolean;
  onRemove?: (playerId: string) => Promise<void>;
}) {
  return (
    <li data-role={player.role} className="px-3">
      <div className="flex items-center gap-3">
        <Initials
          name={player.name}
          role={player.role}
          size="sm"
          dimmed={!isOnline}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-ink">
            {player.name}
            {isYou && <span className="text-ink-subtle"> (você)</span>}
          </p>
          <span
            className="text-[9px] font-black uppercase tracking-[0.1em] text-(--ds-accent)"
            title={`${ROLE_LABEL[player.role]} — não recebe pontuação`}
          >
            {ROLE_SHORT[player.role]} · não pontua
          </span>
        </div>
      </div>
      {onRemove && (
        <RemoveControl player={player} blocked={false} onRemove={onRemove} />
      )}
    </li>
  );
}

/**
 * Uma história no nome de alguém. Para quem conduz, ela pode mudar de dono: os
 * pontos vão inteiros para a pessoa escolhida e o total da história fica igual.
 */
function StoryLine({
  story,
  owner,
  tools,
}: {
  story: ScoredStory;
  owner: Player;
  tools: HostTools | null;
}) {
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const href = safeUrl(story.link);
  const others = tools?.scorers.filter((p) => p.id !== owner.id) ?? [];

  const pass = async (toId: string) => {
    if (!tools || !toId || busy) return;
    setBusy(true);
    try {
      await tools.onReassign(story.storyId, story.side, owner.id, toId);
    } finally {
      setBusy(false);
      setPicking(false);
    }
  };

  return (
    <li className="text-[11px] text-ink-subtle">
      <div className="flex items-center gap-2">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title={story.title}
            className="truncate transition-colors hover:text-brand-400 hover:underline"
          >
            {story.title}
          </a>
        ) : (
          <span className="truncate" title={story.title}>
            {story.title}
          </span>
        )}
        <span className="shrink-0 font-black">
          {story.pending ? "Ag." : story.points}
        </span>
        {tools && others.length > 0 && !picking && (
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="shrink-0 font-bold text-(--ds-accent) hover:underline"
            aria-label={`Passar "${story.title}" de ${owner.name} para outra pessoa`}
          >
            trocar
          </button>
        )}
      </div>

      {picking && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <Select
              size="sm"
              autoFocus
              defaultValue=""
              disabled={busy}
              aria-label={`Para quem vai "${story.title}"`}
              onChange={(e) => void pass(e.target.value)}
            >
              <option value="" disabled>
                Passar para…
              </option>
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {ROLE_SHORT[p.role]}
                </option>
              ))}
            </Select>
          </div>
          {/* Um "×" e não um botão com texto: a coluna do placar é estreita, e
              o espaço tem que ir para o nome de quem recebe. */}
          <button
            type="button"
            onClick={() => setPicking(false)}
            aria-label="Cancelar a troca"
            className="shrink-0 px-1 text-base font-bold leading-none text-ink-subtle hover:text-ink"
          >
            ×
          </button>
        </div>
      )}
    </li>
  );
}

/**
 * Tirar alguém da sala — para a cadeira fantasma de quem entrou duas vezes ou
 * foi embora. Pede confirmação porque a pessoa some da mesa de todo mundo, e
 * quem tem história no nome precisa passá-las adiante antes.
 */
function RemoveControl({
  player,
  blocked,
  onRemove,
}: {
  player: Player;
  blocked: boolean;
  onRemove: (playerId: string) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        data-tone="critical"
        onClick={() => setConfirming(true)}
        className="ml-7 mt-1.5 text-[10px] font-bold text-ink-subtle transition-colors hover:text-(--ds-accent-ink) hover:underline"
      >
        Tirar da sala
      </button>
    );
  }

  return (
    <div className="ml-7 mt-2 rounded-xl bg-[var(--surface-sunken)] p-2.5 text-[11px] leading-snug text-ink">
      {blocked ? (
        <p>
          <span className="font-bold">{player.name}</span> ainda tem histórias.
          Use <span className="font-bold">trocar</span> em cada uma para
          passá-las a outra pessoa, e depois tire da sala.
        </p>
      ) : (
        <p>
          Tirar <span className="font-bold">{player.name}</span> da sala? O voto
          desta rodada sai junto. Pelo link, a pessoa consegue entrar de novo.
        </p>
      )}
      <div className="mt-2 flex gap-1.5">
        {!blocked && (
          <Button
            size="sm"
            tone="critical"
            isDisabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onRemove(player.id);
              } finally {
                setBusy(false);
                setConfirming(false);
              }
            }}
          >
            Tirar
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          {blocked ? "Entendi" : "Cancelar"}
        </Button>
      </div>
    </div>
  );
}

/** De onde a capacidade sai: os dias úteis da janela. */
function SprintFooter({ capacity }: { capacity: TeamCapacity }) {
  const { workingDays, holidayDays } = capacity.window;
  const holidays =
    holidayDays > 0
      ? ` · ${holidayDays} feriado${holidayDays > 1 ? "s" : ""}`
      : "";

  return (
    <div className="mt-5 border-t border-hairline pt-4 text-[10px] font-black uppercase tracking-wider text-ink-subtle">
      {workingDays} dias úteis
      {holidays}
    </div>
  );
}
