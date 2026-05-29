SET NAMES utf8mb4;

INSERT INTO categories (name, description, is_active) VALUES
  ('Radio', 'Configuracao, falha de sinal e troca de equipamento', 1),
  ('Computador', 'Lentidao, formatacao e hardware danificado', 1),
  ('Impressora', 'Papel preso, configuracao e toner', 1),
  ('Rede', 'Sem internet, Wi-Fi e cabeamento', 1),
  ('Software', 'Instalacao, licenca e erro em sistema', 1),
  ('Outro', 'Demandas nao categorizadas acima', 1)
ON DUPLICATE KEY UPDATE
  description = VALUES(description),
  is_active = VALUES(is_active);

INSERT INTO categories (name, description, is_active)
SELECT DISTINCT t.category, NULL, 1
FROM tickets t
LEFT JOIN categories c ON c.name = t.category
WHERE c.id IS NULL;

ALTER TABLE users
  ADD KEY users_reset_token_hash_idx (reset_token_hash),
  ADD KEY users_role_active_idx (role, is_active);

ALTER TABLE tickets
  ADD KEY tickets_status_priority_updated_idx (status, priority, updated_at),
  ADD CONSTRAINT tickets_category_fk FOREIGN KEY (category) REFERENCES categories (name) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ticket_updates
  ADD KEY ticket_updates_ticket_created_idx (ticket_id, created_at);
