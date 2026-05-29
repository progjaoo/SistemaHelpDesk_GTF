SET NAMES utf8mb4;


INSERT INTO users (name, email, password_hash, role, sector, is_active) VALUES
  ('Administrador TI', 'admin@grupogtf.com.br', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', 'TI', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = VALUES(role),
  sector = VALUES(sector),
  is_active = VALUES(is_active);
