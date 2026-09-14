# Planning Poker

Estimativa de sprint em tempo real para times ágeis. Entra pelo link, escolhe a
carta, e ninguém vê o voto de ninguém antes da revelação — garantido pelo banco,
não pela interface.

**Stack:** React 19 · TypeScript · Vite · Tailwind CSS v4 · Supabase (Postgres, RLS, Realtime)

---

## O que ele faz

- **Sessões por código de 6 caracteres** — entra pelo link, sem cadastro.
- **Papéis**: Product Owner, Tech Lead, Front-End, Back-End, QA. PO e Tech Lead
  conduzem; o PO acompanha sem pontuar.
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
- **Tema claro e escuro.**

## Como a segurança funciona

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
select cron.schedule('purge-rooms', '0 4 * * *', 'select purge_expired_rooms()');
```

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
