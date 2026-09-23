# Planning Poker

Estimativa de sprint em tempo real para times ágeis. Entra pelo link, escolhe a
carta, e ninguém vê o voto de ninguém antes da revelação — garantido pelo banco,
não pela interface.

**No ar:** <https://planning-poker-sable-one.vercel.app>

**Stack:** Turborepo · pnpm · React 19 · TypeScript · Vite · Tailwind v4 ·
React Aria · shadcn/ui · Supabase (Postgres, RLS, Realtime) · Docusaurus

```
apps/
├── web/      o produto
└── docs/     a vitrine do design system
packages/
├── ds/       tokens, átomos, moléculas, organismos
├── db/       schema, RLS, funções e os scripts que falam com o banco
└── tsconfig/ as configs compartilhadas
```

---

## O que ele faz

- **Sessões por código de 6 caracteres** — entra pelo link, sem cadastro.
- **Seis estilos de pontuação**: Fibonacci, Fibonacci modificada, linear,
  potências de 2, camisetas (PP–XGG) e uma escala personalizada que você digita.
  Todas começam no meio ponto — não existe carta de 0.
- **Histórias editáveis a qualquer momento** — o PO edita, reordena e exclui,
  tanto ao montar a sprint quanto com a sessão em andamento.
- **Sete papéis**, com "quem vota" e "quem recebe pontos" separados:

  | Papel | Vota | Recebe pontos |
  |---|---|---|
  | Tech Lead, Front-End, Back-End | sempre | sim |
  | Product Owner | se a sala configurar | nunca |
  | QA, Designer, Produto | se a sala configurar | nunca |

  Quem não é dono de entrega está na cerimônia para conhecer as histórias e
  levantar pontos. Se recebe baralho é decisão do PO ou do Tech Lead, escolhida
  ao montar a sprint e ajustável durante a sessão. Todos começam desligados —
  voto de quem não pontua é exceção combinada.

  **Produto** é o nome da cadeira, não da pessoa: é quem vem da área de negócio
  naquela sprint, e isso troca de dono.
- **Histórias tipadas** — só front, só back, ou ambos. Uma história "ambos" é
  votada duas vezes, um lado de cada vez.
- **Votação oculta** com revelação simultânea e carta que vira em 3D.
- **Divisão de pontos** entre as pessoas, com validação de que a soma fecha com
  o total da história.
- **"Ag. Definição"** para histórias que ainda não dá para pontuar — vira
  atribuição de responsável em vez de pontos.
- **Cronômetro por história** — qualquer pessoa da mesa começa a contagem — e
  tempo médio de discussão no resumo.
- **Timebox de discussão**: o PO ou Tech Lead combina quanto tempo uma história
  pode ficar em debate — de 3 a 30 minutos, escolhido ao montar a sprint e
  ajustável durante a sessão. Passando disso, a mesa inteira vê o aviso: não é o
  facilitador que precisa reparar no relógio e interromper. Não existe "sem
  limite" — história que passa de meia hora em debate não está esperando
  discussão, está esperando informação.
- **Presença ao vivo** — quem fechou a aba aparece como ausente e não trava mais
  o contador de votos.
- **Resumo final** copiável em texto plano, com correção manual de pontos.
- **Capacidade do time**: janela de sprint (1 a 4 semanas, como no Scrum, ou
  personalizada com as duas datas), feriados
  nacionais calculados automaticamente, ausências por pessoa e quantos pontos
  cada um assume. O cabeçalho mostra o comprometido contra a capacidade, e muda
  de cor quando o time passa do que cabe.
- **Comemoração de consenso** quando o time inteiro crava a mesma carta — uma
  explosão que sai do centro da mesa, diferente do confete do fim da planning. A
  frase é configurável por ambiente (`VITE_CONSENSUS_CHEERS`), porque piada
  interna é metade da graça de uma cerimônia.
- **Parar hoje e continuar em outro dia**: quando sobram histórias na fila,
  encerrar vira uma escolha. Pausada, a sala guarda o histórico por sete dias e
  o PO ou Tech Lead dá o start de onde o time parou — com 24 horas novas.
- **Tema claro e escuro.**

## Quatro decisões que valem explicar

**Votar e pontuar são coisas diferentes.** Colar os dois é o que obrigaria a QA
a carregar story points para poder opinar, ou a ficar muda para não carregar. O
banco guarda as duas regras separadas: `role_scores()` é fixa por papel,
`player_can_vote()` depende da sala.

E as duas se encaixam numa regra só: `role_is_optional_voter()` é literalmente a
negação de `role_scores()` — quem não carrega story point é exatamente quem tem
voto configurável. Não são duas listas que precisam ser mantidas em sincronia, é
uma regra e o seu avesso. Desligar o voto de alguém no meio de uma rodada apaga
a carta dela, senão ficaria um voto contando para a revelação de quem não
deveria mais ter baralho.

**A tabela não aceita escrita direta.** Não existe policy de INSERT, UPDATE ou
DELETE em tabela nenhuma — só as de leitura. Toda escrita passa por função
`security definer`, que é onde as regras moram. Isso não é zelo abstrato: com
`players_update` aberta, qualquer participante podia rodar
`update players set role = 'tech_lead'` na própria linha, virar host e revelar
as cartas para ler o voto de todo mundo antes da hora.

**Encerrar são duas coisas.** A sessão de hoje acabou, e a planning acabou — e
a planning fica no *começo* da sprint, não no fim. Com fila pendente, o time
quase sempre quer a primeira: pausar, e voltar amanhã de onde parou. Pausada, a
sala fica visível para quem chega pelo link, aceita gente nova, e o start é do
PO ou do Tech Lead.

**O aviso de discussão longa é para a mesa toda.** Quem conduz já tem o que
fazer; reparar no relógio e interromper a conversa é socialmente caro, e por
isso quase nunca acontece na hora certa. Com o aviso na tela de todo mundo, quem
corta não é uma pessoa — é o combinado que o time fez no começo da sessão.

**Sala de 24 horas.** Uma cerimônia dura duas; guardar o resto depois disso é
armazenar dado de gente por nada — e o resumo final já sai da sala pelo botão de
copiar. A validade é verificada na leitura, então "expira em 24 horas" não
depende de quando o cron de faxina roda.

**Teto de 5 sessões abertas por pessoa.** Conta só o que está de pé: encerrar
libera vaga na hora, e o que for abandonado se solta sozinho quando a sala
expira. O limite não é muralha: com login anônimo dá para pedir um usuário novo
por sala, e quem segura isso é o rate limit de sign-in por IP do Supabase. O que
ele faz é barrar o laço acidental e encarecer o abuso.

**Não existe carta de 0.** Zero não é estimativa: se a história foi feita, ela
vale alguma coisa — e uma história de 0 ponto ainda consome dia de alguém sem
aparecer na capacidade do time, o que faz o planejamento mentir. Os casos que
caíam no zero já tinham carta própria: "Ag. Definição" para o que ainda não dá
para dimensionar, "?" para quem não sabe opinar. Uma pessoa continua podendo
ficar com 0 dentro da divisão — é assim que se registra quem não pegou nada
daquela história.

**Camisetas sem quebrar a conta.** Cada carta guarda um rótulo e um valor:
`{ label: "M", value: 3 }`. A mesa mostra a letra, a divisão de pontos usa o
número. É o que permite tamanhos de camiseta num app que reparte pontos entre
as pessoas.

**Histórias já pontuadas não se movem.** Reordenar e excluir valem para a fila
pendente; as encerradas ficam onde estão, senão o resumo da sessão passaria a
contar outra coisa. Excluir uma história já pontuada é permitido — o PO pode ter
errado — mas os pontos voltam de quem os recebeu, na mesma transação.

**Feriados calculados, não buscados.** Os feriados nacionais — inclusive os
móveis, via algoritmo da Páscoa — são computados no cliente. Funcionam offline e
não dependem de um serviço de terceiros continuar no ar. Carnaval e Corpus
Christi vêm marcados como ponto facultativo, que é o que de fato são, e o time
desmarca se trabalha. O que ele escolheu fica salvo na sala, então todo mundo vê
a mesma contagem.

**Dias úteis não são guardados.** Saem da janela toda vez que alguém os lê.
Guardar um número derivado é convite para ele ficar desatualizado quando o PO
mexer nos feriados.

## Como a segurança funciona

Resumo do que protege o quê:

| Superfície | Defesa |
|---|---|
| Voto antes da revelação | RLS: a linha não é devolvida a mais ninguém |
| Escrita em sala alheia | `is_room_host` / `is_room_member` dentro de cada função |
| Papel que não pontua | `role_scores()` barra a alocação no `commit_story`, inclusive para o PO com baralho |
| Link de história | Só `http`/`https`, validado no banco e no cliente |
| Chave no código | Nenhuma: tudo vem de `.env.local`, que está no `.gitignore` |
| Função com privilégio | As 27 `security definer` fixam `search_path` |
| Privilégio de tabela | `authenticated` só tem `select`; `anon` não tem nada |
| Clickjacking / MIME / CSP | Cabeçalhos no `vercel.json` |
| Enchente de salas | Teto de 5 sessões abertas por pessoa |
| Escrita fora das regras | Nenhuma policy de escrita: tudo passa pelas funções |
| Dado parado | Sala expira em 24 horas (7 dias se pausada) e some na faxina |


O ponto central do projeto: **o voto é escondido pelo Postgres, não pelo React.**

```sql
create policy votes_select on votes
  for select to authenticated
  using (
    is_room_member(room_id)
    and (
      room_is_revealed(room_id)
      or player_id in (select id from players where user_id = auth.uid())
    )
  );
```

Antes da revelação, a consulta simplesmente não devolve as linhas dos outros
jogadores — abrir o DevTools ou chamar a API direto não muda nada. Cada pessoa
recebe um JWT anônimo (`signInAnonymously`), que é o que dá ao banco um
`auth.uid()` com que trabalhar. Não há e-mail, senha nem dado pessoal: só um
apelido escolhido na hora.

Toda escrita que toca mais de uma tabela vive numa função `security definer`
(`commit_story`, `join_room`, `add_story`…), então é uma transação só e a
autorização é checada no servidor.

## Rodando localmente

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # preencha com suas chaves
pnpm dev
```

### Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com). Em **Security**,
   pode deixar *"Automatically expose new tables"* desmarcada: as migrações
   concedem o privilégio de leitura explicitamente, então o schema não depende
   de ajuste no painel. *"Enable automatic RLS"* vale marcar — redundante hoje,
   porque as migrações ligam RLS nas cinco tabelas, mas protege qualquer tabela
   criada à mão depois.
2. Em **Authentication → Providers**, ative **Anonymous sign-ins**. Sem isso
   ninguém entra em sala nenhuma: a identidade de cada pessoa é um JWT anônimo.
3. No **SQL Editor**, rode na ordem:
   - todos os arquivos de `packages/db/supabase/migrations/`, em ordem
4. Em **Project Settings → API**, copie `URL` e `anon public key` para o
   `.env.local`.

Opcional — limpeza automática das salas expiradas, via `pg_cron`:

```sql
-- De hora em hora: a sala vale 24h, então uma faxina diária deixaria lixo
-- acumulado por até um dia inteiro depois do vencimento.
select cron.schedule('purge-rooms', '0 * * * *', 'select purge_expired_rooms()');
```

## Credenciais

Nada de chave escrita no código. O app lê `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY` do `.env.local`; os scripts leem as mesmas variáveis do
ambiente e, se não achar, do `.env.local` ou `.env` — todos no `.gitignore`.

Há ainda uma variável opcional, `VITE_CONSENSUS_CHEERS`: as frases da
comemoração de consenso, separadas por `|`. Sem ela, vale a lista padrão. Como é
variável do Vite, ela entra no bundle na hora do build — trocar a frase depois
pede um deploy novo.

A anon key é pública por natureza: ela vai no bundle que o navegador baixa. Quem
protege os dados é o RLS, não o sigilo da chave. Mesmo assim ela não fica no
código-fonte — chave em arquivo versionado é o hábito que um dia vaza a errada.
A `service_role`, essa sim, não aparece em lugar nenhum do projeto: ela ignora o
RLS inteiro.

Os scripts que criam dados de mentira (`smoke`, `demo:consenso`) se recusam a
rodar se o `.env.local` estiver apontando para fora da máquina. Para forçar,
`ALLOW_REMOTE=1`.

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | Sobe tudo que tem `dev` |
| `pnpm build` | Build de todos os pacotes, na ordem das dependências |
| `pnpm typecheck` | Checagem de tipos do monorepo |
| `pnpm lint` | Lint com oxlint |
| `pnpm db:start` | Sobe um Supabase local em Docker |
| `pnpm db:reset` | Recria o banco local a partir das migrations |
| `pnpm smoke` | Roda as 169 verificações de ponta a ponta |
| `pnpm seed` | Cria uma sala de demonstração já povoada |
| `pnpm demo:consenso 13` | Deixa uma sala pronta para ver a comemoração |
| `pnpm awake` | Visita a produção para o projeto não pausar (ver abaixo) |

## A visita semanal

O plano Free do Supabase **pausa um projeto depois de 7 dias sem atividade**.
Despausar é um botão no painel, mas quem descobre que era preciso é a pessoa que
abriu o link e não viu nada.

```bash
pnpm awake
```

Ele entra como convidado e lê uma linha — o mínimo que conta como atividade.
Não cria sala, não escreve nada e não usa chave secreta. Aponta para a produção
lendo `apps/web/.env.local`, e recusa rodar contra um banco local, onde não há o
que acordar.

Rodar uma vez por semana basta. Na prática, o melhor momento é logo antes de
mandar o link para alguém: aí você confirma que está de pé no único momento em
que isso importa.

## Estrutura

```
apps/web/src/
  components/    peças do produto (mesa, baralho, resumo)
  hooks/         useAuth, useRoomState (realtime), useGameActions
  lib/           supabase, api (RPCs), gameView, derive
  pages/         Landing, SprintSetup, JoinRoom, Game
  types/         modelo de domínio

  rotas:         /  ·  /new  ·  /join/:code  ·  /room/:code
                 os endereços em português da versão anterior redirecionam,
                 porque link de sala circula em chat e calendário

packages/ds/src/
  tokens/        o style guide, as rampas e a ponte para o shadcn
  ui/            primitivos do registry — não editamos
  atoms/         Button, Input, Select, Checkbox, Badge, Note, Progress,
                 Card, Spinner, Initials, Logo
  molecules/     Field, PersonChip, StatBlock
  organisms/     Modal

packages/db/
  supabase/migrations/   schema, RLS e funções
  scripts/               smoke, seed, demo
```

## Design system

Componentes do registry do **shadcn/ui** com base **React Aria**, em
`packages/ds/src/ui/`, mantidos byte a byte como vieram — é o que deixa
`shadcn add` e `shadcn diff` úteis. O ajuste fino acontece uma camada acima, em
`atoms/`.

O tema chega neles por tradução: `tokens/shadcn-bridge.css` mapeia os papéis que
o shadcn espera (`--primary`, `--muted`, `--destructive`) para os tokens da
marca. Mexer numa cor reflete na biblioteca inteira, porque nenhum componente
tem valor escrito dentro.

**Cor é atributo, não prop.** O papel da pessoa vira `data-role` no HTML, e o
tema resolve: o componente lê `--ds-accent` e nunca sabe que Front-End é ciano.
São sete rampas de onze degraus, derivadas da curva da marca em OKLCH — cada
degrau repete o passo de luminosidade e a proporção de croma que a marca tem
naquele ponto, o que faz `mint-200` e `grape-200` pesarem o mesmo na tela.

**O vocabulário dos componentes segue o [Preline](https://preline.co).** O botão
tem `solid`, `soft`, `outline`, `ghost`, `white` e `link` — a escada inteira de
ênfase — e a cor é um eixo à parte (`tone`). Cada tom entrega seis variantes
prontas (repouso, hover, pressionado, tinta, fundo lavado, traço), já resolvidas
para claro e escuro com `light-dark()`. Nada disso é dependência: o Preline é
HTML e Tailwind, então o que veio foi o vocabulário, não a biblioteca.

As duas exceções são `joy` e `joy-mirror`, o degradê da marca: existem para as
duas pontas da jornada — criar a sessão e sentar nela — e o espelho corre ao
contrário, o que faz as telas se reconhecerem como par sem serem a mesma coisa.

A vitrine roda em `apps/docs` com playground ao vivo:

```bash
pnpm --filter @pp/docs dev    # http://localhost:3100
```

## Como abrir um PR

O caminho inteiro, com um exemplo de verdade: acrescentar um estilo de
pontuação novo, a escala de horas.

**1. Fork, clone e branch a partir da `main` atualizada.**

```bash
gh repo fork ipires-18/planning-poker --clone
cd planning-poker
git switch main && git pull
git switch -c escala-de-horas
```

O nome da branch diz o que muda, em português e com hífen. Nada de `fix-1` ou
`minha-branch`: a lista de branches é lida por gente.

**2. Suba o ambiente local.**

```bash
pnpm install
pnpm db:start                                   # Supabase em Docker
pnpm db:reset                                   # aplica as migrations
cp apps/web/.env.example apps/web/.env.local    # use a URL e a anon key que o db:start imprime
pnpm dev
```

Desenvolva contra o banco local, nunca contra a produção — o `smoke` nem roda
fora da máquina.

**3. Faça a mudança.** Duas regras que não são óbvias:

- **Mexeu no banco? Migration nova, nunca edição de uma antiga.** As que já
  existem já rodaram na produção. Numere a partir da última:
  `packages/db/supabase/migrations/0019_escala_de_horas.sql`.
- **Não edite `packages/ds/src/ui/`.** São os componentes do shadcn byte a byte;
  ajuste vai em `atoms/` (ver [Design system](#design-system)).

**4. Rode as verificações antes de subir.** É o que alguém vai rodar na revisão:

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm smoke      # precisa do db:start de pé
```

Se o `smoke` não cobre o que você mudou, acrescente a verificação no mesmo PR.

**5. Commit no estilo do histórico.** Título curto em português, dizendo o que
muda — sem `feat:`, sem ponto final. O corpo explica o **porquê**, que é o que o
diff não mostra:

```bash
git add -A
git commit
```

```
Escala de horas como estilo de pontuação

Times que estimam em horas usavam a escala personalizada e digitavam os
mesmos oito números em toda sprint. Agora é um estilo pronto: 1, 2, 4, 8,
12, 16, 24 e 40.

O valor da carta é a própria hora, então a divisão de pontos continua
fechando com o total da história sem conversão nenhuma.
```

Um assunto por commit. Se no caminho você consertou outra coisa, ela vira outro
commit — ou outro PR.

**6. Push e abertura do PR.**

```bash
git push -u origin escala-de-horas
gh pr create --base main --title "Escala de horas como estilo de pontuação" --body-file -
```

E o corpo, colado no terminal (termine com `Ctrl+D`):

```markdown
## O que muda

Novo estilo de pontuação, **Horas**: 1, 2, 4, 8, 12, 16, 24, 40.

## Por quê

Times que estimam em horas recriavam a escala personalizada toda sprint.

## Como testar

1. `pnpm db:reset && pnpm dev`
2. Em `/new`, escolha **Horas** em Estilo de pontuação
3. Vote numa história, revele e divida os pontos: a soma tem que fechar

## Verificações

- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm build`
- [x] `pnpm smoke`
- [x] Migration nova (`0019_escala_de_horas.sql`), nenhuma antiga editada
- [ ] Mudança visual? Print claro e escuro abaixo
```

Mexeu na interface, anexe print nos dois temas. Mexeu em RLS ou em função
`security definer`, diga no corpo quem passa a poder fazer o quê — é a parte do
PR que mais precisa de olho.

**7. Depois da revisão.** Ajustes entram como commits novos na mesma branch
(`git push` atualiza o PR). Se a `main` andou, traga com rebase, não com merge:

```bash
git fetch upstream
git rebase upstream/main
git push --force-with-lease
```

## Sobre a reconstrução

Esta é a segunda versão do projeto. A primeira usava Firebase Realtime Database
e guardava os jogadores num array indexado, escrito por posição — duas pessoas
entrando ao mesmo tempo sobrescreviam uma à outra. As mudanças de fundo:

| Antes | Agora |
|---|---|
| Array de jogadores escrito por índice | Tabela com chave única `(sala, usuário)` |
| `get()` + `update()` no cliente | Transação única em função SQL |
| Votos escondidos pela UI | Votos escondidos por RLS |
| Sem identidade | JWT anônimo por pessoa |
| Quem saía continuava na mesa | Presença em tempo real |
| Sessão no `localStorage` | Cadeira encontrada pelo `user_id` |
| `prompt()` / `alert()` | Edição inline e modais |
