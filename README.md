# Planning Poker

Estimativa de sprint em tempo real para times ágeis. Entra pelo link, escolhe a
carta, e ninguém vê o voto de ninguém antes da revelação — garantido pelo banco,
não pela interface.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Supabase (Postgres, RLS, Realtime)

---

## O que ele faz

- **Sessões por código de 6 caracteres** — entra pelo link, sem cadastro.
- **Seis estilos de pontuação**: Fibonacci, Fibonacci modificada, linear,
  potências de 2, camisetas (PP–XGG) e uma escala personalizada que você digita.
  Todas começam no meio ponto — não existe carta de 0.
- **Histórias editáveis a qualquer momento** — o PO edita, reordena e exclui,
  tanto ao montar a sprint quanto com a sessão em andamento.
- **Papéis**: Product Owner, Tech Lead, Front-End, Back-End e QA — com "quem
  vota" e "quem recebe pontos" separados:

  | Papel | Vota | Recebe pontos |
  |---|---|---|
  | Product Owner | não | não |
  | Tech Lead | sim | sim |
  | Front-End / Back-End | sim | sim |
  | QA | conforme a sala | não |

  A QA está na cerimônia para conhecer as histórias e levantar pontos, mas não é
  dona de entrega. Se ela recebe baralho é decisão do PO ou do Tech Lead, sessão
  a sessão.
- **Histórias tipadas** — só front, só back, ou ambos. Uma história "ambos" é
  votada duas vezes, um lado de cada vez.
- **Votação oculta** com revelação simultânea e carta que vira em 3D.
- **Divisão de pontos** entre as pessoas, com validação de que a soma fecha com
  o total da história.
- **"Ag. Definição"** para histórias que ainda não dá para pontuar — vira
  atribuição de responsável em vez de pontos.
- **Cronômetro por história** e tempo médio de discussão no resumo.
- **Presença ao vivo** — quem fechou a aba aparece como ausente e não trava mais
  o contador de votos.
- **Resumo final** copiável em texto plano, com correção manual de pontos.
- **Capacidade do time**: janela de sprint (1 a 4 semanas ou 15 dias), feriados
  nacionais calculados automaticamente, ausências por pessoa e quantos pontos
  cada um assume. O cabeçalho mostra o comprometido contra a capacidade, e muda
  de cor quando o time passa do que cabe.
- **Comemoração de consenso** quando o time inteiro crava a mesma carta — uma
  explosão que sai do centro da mesa, diferente do confete do fim da sprint.
- **Tema claro e escuro.**

## Quatro decisões que valem explicar

**Votar e pontuar são coisas diferentes.** Colar os dois é o que obrigaria a QA
a carregar story points para poder opinar, ou a ficar muda para não carregar. O
banco guarda as duas regras separadas: `role_scores()` é fixa por papel,
`player_can_vote()` depende da sala. Desligar o voto da QA no meio de uma rodada
apaga a carta dela, senão ficaria um voto contando para a revelação de quem não
deveria mais ter baralho.

**A tabela não aceita escrita direta.** Não existe policy de INSERT, UPDATE ou
DELETE em tabela nenhuma — só as de leitura. Toda escrita passa por função
`security definer`, que é onde as regras moram. Isso não é zelo abstrato: com
`players_update` aberta, qualquer participante podia rodar
`update players set role = 'tech_lead'` na própria linha, virar host e revelar
as cartas para ler o voto de todo mundo antes da hora.

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
| Papel que não pontua | `role_scores()` barra a alocação no `commit_story` |
| Link de história | Só `http`/`https`, validado no banco e no cliente |
| Chave no código | Nenhuma: tudo vem de `.env.local`, que está no `.gitignore` |
| Função com privilégio | As 29 `security definer` fixam `search_path` |
| Clickjacking / MIME / CSP | Cabeçalhos no `vercel.json` |
| Enchente de salas | Teto de 5 sessões abertas por pessoa |
| Escrita fora das regras | Nenhuma policy de escrita: tudo passa pelas funções |
| Dado parado | Sala expira em 24 horas e some na faxina |


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
npm install
cp .env.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

### Configurando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Authentication → Providers**, ative **Anonymous sign-ins**.
3. No **SQL Editor**, rode na ordem:
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_rpc.sql`
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
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Checagem de tipos + build de produção |
| `npm run preview` | Serve o build local |
| `npm run lint` | Lint com oxlint |
| `npm run db:start` | Sobe um Supabase local em Docker |
| `npm run db:reset` | Recria o banco local a partir das migrations |
| `npm run smoke` | Roda as verificações de ponta a ponta |
| `npm run seed` | Cria uma sala de demonstração já povoada |
| `npm run seed ABC123` | Povoa uma sala existente com 4 participantes |
| `npm run demo:consenso 13` | Deixa uma sala pronta para ver a comemoração |

## Estrutura

```
src/
  components/    peças de UI (mesa, baralho, resumo, primitivos)
  hooks/         useAuth, useRoomState (realtime), useTheme
  lib/           supabase, api (RPCs), derive (cálculos de resumo)
  pages/         Landing, SprintSetup, JoinRoom, Game
  types/         modelo de domínio
supabase/
  migrations/    schema, RLS e funções
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
