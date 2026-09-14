-- ============================================================================
-- Tira o que sobrou do padrão
--
-- Além do `select` que a 0017 concede, as roles da Data API herdam do padrão
-- do Supabase três privilégios que este schema nunca quis: `truncate`,
-- `references` e `trigger`.
--
-- Nenhum deles é alcançável pelo PostgREST — ele só fala SELECT, INSERT,
-- UPDATE, DELETE e RPC, e as nossas funções rodam como dono de qualquer jeito.
-- Mas "não dá para explorar por este cliente" é garantia fraca: ela depende do
-- cliente, não do banco. E `truncate` em particular é a operação que o RLS não
-- protege — ele apaga a tabela inteira sem consultar policy nenhuma.
--
-- Depois disto, `authenticated` tem exatamente um privilégio em cada tabela:
-- ler. É o que o desenho sempre disse, agora também no catálogo.
-- ============================================================================

revoke truncate, references, trigger
  on table rooms, players, stories, votes, story_participants
  from anon, authenticated;

revoke insert, update, delete
  on table rooms, players, stories, votes, story_participants
  from anon, authenticated;

revoke all on table rooms, players, stories, votes, story_participants from anon;
