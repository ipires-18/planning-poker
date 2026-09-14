import { Button } from '@pp/ds/atoms'
import { cx } from '@/lib/cx'
import { OPTIONAL_VOTERS, ROLE_LABEL, type OptionalVoterRole } from '@/types'

/**
 * As regras da sessão: quem vota, e quanto tempo cada história pode ficar em
 * discussão.
 *
 * Vivem aqui, e não dentro do painel de capacidade, porque são perguntadas em
 * dois momentos — ao montar a sprint, antes de a sala existir, e durante a
 * sessão, quando o time muda de ideia. Duas telas, uma peça: senão elas
 * divergem na primeira vez que alguém ajustar o texto de um lado só.
 */

/**
 * O baralho de quem não pontua.
 *
 * São quatro na mesma condição — PO, QA, Designer e Produto. Nenhum deles
 * recebe story point em nenhuma configuração; ter carta na mão é decisão do PO
 * / Tech Lead, sala a sala, porque depende do quanto aquela pessoa conhece o
 * escopo naquela sprint.
 *
 * Todos começam desligados: voto de quem não pontua é exceção combinada.
 */
const EXPLICACAO: Record<OptionalVoterRole, string> = {
  po: 'Em time pequeno, a opinião dele ajuda; em time grande, ancora a mesa. Por isso é escolha da sala — e mesmo votando, o PO nunca recebe story point.',
  qa: 'Desligado, a QA acompanha e levanta pontos sem carta na mão.',
  designer: 'Desligado, o Designer acompanha e aponta o que muda na interface sem votar.',
  product:
    'A cadeira do negócio — quem vem de fora do time nesta sprint. Desligado, acompanha e esclarece escopo sem votar.',
}

function OptionalVoterToggle({
  role,
  enabled,
  present,
  onChange,
}: {
  role: OptionalVoterRole
  enabled: boolean
  present: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <label
      data-role={role}
      className={cx(
        'flex cursor-pointer items-start gap-3 rounded-2xl p-4 transition-colors',
        enabled ? 'ds-accent-wash' : 'bg-sunken',
      )}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer accent-(--ds-accent)"
      />
      <span className="min-w-0">
        <span className="block text-sm font-bold text-ink">
          {ROLE_LABEL[role]} vota nesta sessão
        </span>
        <span className="mt-1 block text-xs leading-snug text-ink-subtle">
          {EXPLICACAO[role]} Em qualquer um dos casos não recebe pontuação — quem carrega story
          point é Tech Lead, Front e Back.
          {!present && role !== 'po' && ' Ninguém sentou nesta cadeira ainda.'}
        </span>
      </span>
    </label>
  )
}

const LIMITES = [
  { segundos: 180, rotulo: '3 min' },
  { segundos: 300, rotulo: '5 min' },
  { segundos: 480, rotulo: '8 min' },
  { segundos: 600, rotulo: '10 min' },
  { segundos: 900, rotulo: '15 min' },
  { segundos: 1200, rotulo: '20 min' },
  { segundos: 1500, rotulo: '25 min' },
  { segundos: 1800, rotulo: '30 min' },
]

/**
 * Quanto tempo uma história pode ficar em discussão.
 *
 * Passando disso a mesa inteira vê o aviso — e é de propósito que ele apareça
 * para todos, e não só para quem conduz: reparar no relógio e interromper a
 * conversa é socialmente caro, e por isso quase nunca acontece. Com o aviso na
 * tela, quem corta não é uma pessoa, é o combinado.
 */
export function DiscussionLimitPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (seconds: number) => void
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {LIMITES.map((limite) => (
          <Button
            key={limite.segundos}
            size="sm"
            variant={value === limite.segundos ? 'solid' : 'outline'}
            onClick={() => onChange(limite.segundos)}
          >
            {limite.rotulo}
          </Button>
        ))}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
        Passando do tempo, a mesa inteira vê um aviso para anotar a dúvida e seguir — dá
        para revisitar a história depois. Sempre há um teto: história que passa de meia
        hora em debate não está esperando discussão, está esperando informação.
      </p>
    </div>
  )
}

/** Os quatro interruptores juntos, que é como eles são sempre usados. */
export function OptionalVoterToggles({
  value,
  present = [],
  onChange,
}: {
  value: OptionalVoterRole[]
  /** Quais cadeiras já estão ocupadas. Vazio ao montar a sprint: ninguém entrou ainda. */
  present?: OptionalVoterRole[]
  onChange: (role: OptionalVoterRole, enabled: boolean) => void
}) {
  return (
    <div className="space-y-2">
      {OPTIONAL_VOTERS.map((papel) => (
        <OptionalVoterToggle
          key={papel}
          role={papel}
          enabled={value.includes(papel)}
          present={present.includes(papel)}
          onChange={(enabled) => onChange(papel, enabled)}
        />
      ))}
    </div>
  )
}
