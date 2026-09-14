-- ============================================================================
-- Dois papéis novos: Designer e Produto
--
-- "Produto" é de propósito o nome do papel e não da pessoa: é a cadeira de quem
-- vem da área de negócio para a cerimônia, e ela troca de dono de sprint para
-- sprint. Chamar de "PM" ou pelo nome de alguém envelheceria na primeira
-- mudança de time.
--
-- Este arquivo só acrescenta os valores ao enum, e nada mais. O Postgres não
-- deixa usar um valor de enum na mesma transação em que ele foi criado, e cada
-- migração roda na sua — por isso quem usa os valores novos é a 0013.
-- ============================================================================

alter type player_role add value if not exists 'designer';
alter type player_role add value if not exists 'product';
