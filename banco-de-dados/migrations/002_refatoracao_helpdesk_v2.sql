SET NAMES utf8mb4;
SET time_zone = '+00:00';

DELIMITER $$

DROP PROCEDURE IF EXISTS add_column_if_missing $$
CREATE PROCEDURE add_column_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_column_name VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND COLUMN_NAME = p_column_name
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table_name, '` ADD COLUMN ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DROP PROCEDURE IF EXISTS add_index_if_missing $$
CREATE PROCEDURE add_index_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_index_name VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND INDEX_NAME = p_index_name
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table_name, '` ADD ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DROP PROCEDURE IF EXISTS add_fk_if_missing $$
CREATE PROCEDURE add_fk_if_missing(
  IN p_table_name VARCHAR(64),
  IN p_constraint_name VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table_name
      AND CONSTRAINT_NAME = p_constraint_name
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  ) THEN
    SET @sql = CONCAT('ALTER TABLE `', p_table_name, '` ADD CONSTRAINT ', p_definition);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DROP PROCEDURE IF EXISTS migrate_ticket_attachments_from_json $$
CREATE PROCEDURE migrate_ticket_attachments_from_json()
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tickets'
      AND COLUMN_NAME = 'attachments'
  ) THEN
    INSERT INTO ticket_attachments (
      ticket_id,
      uploaded_by,
      file_name,
      original_name,
      mime_type,
      extension,
      file_size,
      file_data,
      created_at
    )
    SELECT
      t.id,
      t.user_id,
      CONCAT('ticket_', t.id, '_', jt.ord, '.', COALESCE(NULLIF(SUBSTRING_INDEX(jt.name, '.', -1), jt.name), 'bin')),
      jt.name,
      jt.mime_type,
      COALESCE(NULLIF(SUBSTRING_INDEX(jt.name, '.', -1), jt.name), NULL),
      COALESCE(jt.size_kb * 1024, 0),
      jt.data_base64,
      t.created_at
    FROM tickets t
    JOIN JSON_TABLE(
      t.attachments,
      '$[*]' COLUMNS (
        ord FOR ORDINALITY,
        name VARCHAR(255) PATH '$.name' NULL ON EMPTY,
        mime_type VARCHAR(120) PATH '$.mime_type' NULL ON EMPTY,
        size_kb BIGINT PATH '$.size_kb' NULL ON EMPTY,
        data_base64 LONGTEXT PATH '$.data_base64' NULL ON EMPTY
      )
    ) AS jt
    WHERE JSON_VALID(t.attachments)
      AND jt.data_base64 IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM ticket_attachments ta
        WHERE ta.ticket_id = t.id
          AND ta.original_name = jt.name
          AND ta.file_size = COALESCE(jt.size_kb * 1024, 0)
      );
  END IF;
END $$

DELIMITER ;

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(40) NOT NULL,
  description VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY roles_name_unique (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (name, description) VALUES
  ('admin', 'Administrador do sistema'),
  ('tecnico', 'Tecnico de atendimento'),
  ('user', 'Usuario comum'),
  ('supervisor', 'Supervisor de atendimento')
ON DUPLICATE KEY UPDATE description = VALUES(description);

ALTER TABLE users
  MODIFY COLUMN role ENUM('admin', 'tecnico', 'user', 'supervisor') NOT NULL DEFAULT 'user';

CREATE TABLE IF NOT EXISTS broadcasters (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  city VARCHAR(80) NULL,
  state CHAR(2) NULL,
  internal_code VARCHAR(40) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  deleted_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY broadcasters_name_unique (name),
  UNIQUE KEY broadcasters_internal_code_unique (internal_code),
  KEY broadcasters_active_idx (is_active),
  KEY broadcasters_deleted_idx (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL add_column_if_missing('broadcasters', 'internal_code', 'internal_code VARCHAR(40) NULL AFTER state');
CALL add_column_if_missing('broadcasters', 'deleted_at', 'deleted_at DATETIME NULL AFTER is_active');
CALL add_index_if_missing('broadcasters', 'broadcasters_internal_code_unique', 'UNIQUE KEY broadcasters_internal_code_unique (internal_code)');
CALL add_index_if_missing('broadcasters', 'broadcasters_deleted_idx', 'KEY broadcasters_deleted_idx (deleted_at)');

CALL add_column_if_missing('categories', 'sort_order', 'sort_order INT NOT NULL DEFAULT 0 AFTER description');
CALL add_column_if_missing('categories', 'color', 'color VARCHAR(20) NULL AFTER sort_order');
CALL add_column_if_missing('categories', 'icon', 'icon VARCHAR(60) NULL AFTER color');
CALL add_column_if_missing('categories', 'deleted_at', 'deleted_at DATETIME NULL AFTER is_active');
CALL add_index_if_missing('categories', 'categories_sort_order_idx', 'KEY categories_sort_order_idx (sort_order)');
CALL add_index_if_missing('categories', 'categories_deleted_idx', 'KEY categories_deleted_idx (deleted_at)');

CALL add_column_if_missing('users', 'role_id', 'role_id BIGINT UNSIGNED NULL AFTER role');
CALL add_column_if_missing('users', 'broadcaster_id', 'broadcaster_id BIGINT UNSIGNED NULL AFTER sector');
CALL add_column_if_missing('users', 'phone', 'phone VARCHAR(30) NULL AFTER broadcaster_id');
CALL add_column_if_missing('users', 'avatar_base64', 'avatar_base64 LONGTEXT NULL AFTER phone');
CALL add_column_if_missing('users', 'last_login_at', 'last_login_at DATETIME NULL AFTER avatar_base64');
CALL add_column_if_missing('users', 'last_login_ip', 'last_login_ip VARCHAR(45) NULL AFTER last_login_at');
CALL add_column_if_missing('users', 'failed_login_attempts', 'failed_login_attempts INT NOT NULL DEFAULT 0 AFTER last_login_ip');
CALL add_column_if_missing('users', 'locked_until', 'locked_until DATETIME NULL AFTER failed_login_attempts');
CALL add_column_if_missing('users', 'email_verified_at', 'email_verified_at DATETIME NULL AFTER locked_until');
CALL add_column_if_missing('users', 'deleted_at', 'deleted_at DATETIME NULL AFTER email_verified_at');

UPDATE users u
JOIN roles r ON r.name = u.role
SET u.role_id = r.id
WHERE u.role_id IS NULL;

CALL add_index_if_missing('users', 'users_role_id_idx', 'KEY users_role_id_idx (role_id)');
CALL add_index_if_missing('users', 'users_broadcaster_idx', 'KEY users_broadcaster_idx (broadcaster_id)');
CALL add_index_if_missing('users', 'users_deleted_idx', 'KEY users_deleted_idx (deleted_at)');
CALL add_index_if_missing('users', 'users_last_login_idx', 'KEY users_last_login_idx (last_login_at)');
CALL add_fk_if_missing('users', 'users_role_id_fk', 'users_role_id_fk FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT');
CALL add_fk_if_missing('users', 'users_broadcaster_fk', 'users_broadcaster_fk FOREIGN KEY (broadcaster_id) REFERENCES broadcasters (id) ON DELETE SET NULL');

CALL add_column_if_missing('tickets', 'category_id', 'category_id BIGINT UNSIGNED NULL AFTER category');
CALL add_column_if_missing('tickets', 'broadcaster_id', 'broadcaster_id BIGINT UNSIGNED NULL AFTER location');
CALL add_column_if_missing('tickets', 'problem_type', 'problem_type VARCHAR(80) NULL AFTER broadcaster_id');
CALL add_column_if_missing('tickets', 'affected_environment', 'affected_environment VARCHAR(120) NULL AFTER problem_type');
CALL add_column_if_missing('tickets', 'affected_equipment', 'affected_equipment VARCHAR(120) NULL AFTER affected_environment');
CALL add_column_if_missing('tickets', 'patrimony_number', 'patrimony_number VARCHAR(60) NULL AFTER affected_equipment');
CALL add_column_if_missing('tickets', 'attachments', 'attachments JSON NULL AFTER patrimony_number');
CALL add_column_if_missing('tickets', 'sla_due_at', 'sla_due_at DATETIME NULL AFTER assigned_to');
CALL add_column_if_missing('tickets', 'first_response_at', 'first_response_at DATETIME NULL AFTER sla_due_at');
CALL add_column_if_missing('tickets', 'resolved_at', 'resolved_at DATETIME NULL AFTER first_response_at');
CALL add_column_if_missing('tickets', 'closed_at', 'closed_at DATETIME NULL AFTER resolved_at');
CALL add_column_if_missing('tickets', 'closed_by', 'closed_by BIGINT UNSIGNED NULL AFTER closed_at');
CALL add_column_if_missing('tickets', 'deleted_at', 'deleted_at DATETIME NULL AFTER closed_by');

INSERT INTO categories (name, description, is_active)
SELECT DISTINCT t.category, NULL, 1
FROM tickets t
LEFT JOIN categories c ON c.name = t.category
WHERE t.category IS NOT NULL
  AND c.id IS NULL;

UPDATE tickets t
JOIN categories c ON c.name = t.category
SET t.category_id = c.id
WHERE t.category_id IS NULL;

UPDATE tickets t
JOIN users u ON u.id = t.user_id
SET t.broadcaster_id = u.broadcaster_id
WHERE t.broadcaster_id IS NULL
  AND u.broadcaster_id IS NOT NULL;

CALL add_index_if_missing('tickets', 'tickets_category_id_idx', 'KEY tickets_category_id_idx (category_id)');
CALL add_index_if_missing('tickets', 'tickets_broadcaster_idx', 'KEY tickets_broadcaster_idx (broadcaster_id)');
CALL add_index_if_missing('tickets', 'tickets_deleted_idx', 'KEY tickets_deleted_idx (deleted_at)');
CALL add_index_if_missing('tickets', 'tickets_sla_status_idx', 'KEY tickets_sla_status_idx (status, sla_due_at)');
CALL add_index_if_missing('tickets', 'tickets_dashboard_idx', 'KEY tickets_dashboard_idx (status, priority, broadcaster_id, created_at)');
CALL add_index_if_missing('tickets', 'tickets_patrimony_idx', 'KEY tickets_patrimony_idx (patrimony_number)');
CALL add_fk_if_missing('tickets', 'tickets_category_id_fk', 'tickets_category_id_fk FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT');
CALL add_fk_if_missing('tickets', 'tickets_broadcaster_fk', 'tickets_broadcaster_fk FOREIGN KEY (broadcaster_id) REFERENCES broadcasters (id) ON DELETE SET NULL');
CALL add_fk_if_missing('tickets', 'tickets_closed_by_fk', 'tickets_closed_by_fk FOREIGN KEY (closed_by) REFERENCES users (id) ON DELETE SET NULL');

CREATE TABLE IF NOT EXISTS ticket_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NULL,
  mime_type VARCHAR(120) NOT NULL,
  extension VARCHAR(20) NULL,
  file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  file_data LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ticket_attachments_ticket_idx (ticket_id),
  KEY ticket_attachments_uploaded_by_idx (uploaded_by),
  KEY ticket_attachments_created_idx (created_at),
  CONSTRAINT ticket_attachments_ticket_fk FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
  CONSTRAINT ticket_attachments_uploaded_by_fk FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_update_attachments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_update_id BIGINT UNSIGNED NOT NULL,
  uploaded_by BIGINT UNSIGNED NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NULL,
  mime_type VARCHAR(120) NOT NULL,
  extension VARCHAR(20) NULL,
  file_size BIGINT UNSIGNED NOT NULL DEFAULT 0,
  file_data LONGTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ticket_update_attachments_update_idx (ticket_update_id),
  KEY ticket_update_attachments_uploaded_by_idx (uploaded_by),
  CONSTRAINT ticket_update_attachments_update_fk FOREIGN KEY (ticket_update_id) REFERENCES ticket_updates (id) ON DELETE CASCADE,
  CONSTRAINT ticket_update_attachments_uploaded_by_fk FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CALL migrate_ticket_attachments_from_json();

CREATE TABLE IF NOT EXISTS ticket_status_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  changed_by BIGINT UNSIGNED NULL,
  old_status VARCHAR(40) NULL,
  new_status VARCHAR(40) NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ticket_status_history_ticket_idx (ticket_id),
  KEY ticket_status_history_changed_by_idx (changed_by),
  KEY ticket_status_history_created_idx (created_at),
  CONSTRAINT ticket_status_history_ticket_fk FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
  CONSTRAINT ticket_status_history_changed_by_fk FOREIGN KEY (changed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(60) NOT NULL,
  title VARCHAR(160) NOT NULL,
  message TEXT NOT NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY notifications_user_read_idx (user_id, is_read, created_at),
  KEY notifications_type_idx (type),
  CONSTRAINT notifications_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_queue (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipient VARCHAR(180) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html LONGTEXT NULL,
  body_text LONGTEXT NULL,
  status ENUM('pending', 'processing', 'sent', 'failed') NOT NULL DEFAULT 'pending',
  retries INT NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  sent_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY email_queue_status_created_idx (status, created_at),
  KEY email_queue_recipient_idx (recipient),
  KEY email_queue_sent_idx (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  table_name VARCHAR(80) NOT NULL,
  record_id BIGINT UNSIGNED NULL,
  old_data JSON NULL,
  new_data JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY audit_logs_user_idx (user_id),
  KEY audit_logs_table_record_idx (table_name, record_id),
  KEY audit_logs_action_idx (action),
  KEY audit_logs_created_idx (created_at),
  CONSTRAINT audit_logs_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  device_info VARCHAR(255) NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(255) NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY user_sessions_refresh_token_unique (refresh_token_hash),
  KEY user_sessions_user_idx (user_id),
  KEY user_sessions_valid_idx (user_id, revoked_at, expires_at),
  CONSTRAINT user_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_priorities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(40) NOT NULL,
  weight INT NOT NULL DEFAULT 0,
  color VARCHAR(20) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ticket_priorities_name_unique (name),
  KEY ticket_priorities_active_weight_idx (is_active, weight)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ticket_priorities (name, weight, color, is_active) VALUES
  ('Baixa', 1, '#22c55e', 1),
  ('Media', 2, '#eab308', 1),
  ('Alta', 3, '#f97316', 1),
  ('Urgente', 4, '#ef4444', 1)
ON DUPLICATE KEY UPDATE
  weight = VALUES(weight),
  color = VALUES(color),
  is_active = VALUES(is_active);

CREATE TABLE IF NOT EXISTS ticket_statuses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(60) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  color VARCHAR(20) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ticket_statuses_name_unique (name),
  KEY ticket_statuses_active_sort_idx (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ticket_statuses (name, sort_order, color, is_active) VALUES
  ('Aberto', 1, '#2563eb', 1),
  ('Em Atendimento', 2, '#7c3aed', 1),
  ('Aguardando Usuario', 3, '#eab308', 1),
  ('Resolvido', 4, '#16a34a', 1),
  ('Fechado', 5, '#64748b', 1)
ON DUPLICATE KEY UPDATE
  sort_order = VALUES(sort_order),
  color = VALUES(color),
  is_active = VALUES(is_active);

DROP PROCEDURE IF EXISTS migrate_ticket_attachments_from_json;
DROP PROCEDURE IF EXISTS add_fk_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;
DROP PROCEDURE IF EXISTS add_column_if_missing;
