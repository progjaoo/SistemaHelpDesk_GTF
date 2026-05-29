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

DELIMITER ;

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

CALL add_column_if_missing('users', 'broadcaster_id', 'broadcaster_id BIGINT UNSIGNED NULL AFTER sector');
CALL add_index_if_missing('users', 'users_broadcaster_idx', 'KEY users_broadcaster_idx (broadcaster_id)');
CALL add_fk_if_missing('users', 'users_broadcaster_fk', 'users_broadcaster_fk FOREIGN KEY (broadcaster_id) REFERENCES broadcasters (id) ON DELETE SET NULL');

CALL add_column_if_missing('tickets', 'broadcaster_id', 'broadcaster_id BIGINT UNSIGNED NULL AFTER location');
CALL add_index_if_missing('tickets', 'tickets_broadcaster_idx', 'KEY tickets_broadcaster_idx (broadcaster_id)');
CALL add_fk_if_missing('tickets', 'tickets_broadcaster_fk', 'tickets_broadcaster_fk FOREIGN KEY (broadcaster_id) REFERENCES broadcasters (id) ON DELETE SET NULL');

INSERT INTO broadcasters (name, city, state, internal_code, is_active)
VALUES ('Grupo GTF', NULL, NULL, 'GTF', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  city = VALUES(city),
  state = VALUES(state),
  is_active = VALUES(is_active),
  deleted_at = NULL;

UPDATE users
SET broadcaster_id = (SELECT id FROM broadcasters WHERE internal_code = 'GTF' LIMIT 1)
WHERE broadcaster_id IS NULL;

UPDATE tickets t
JOIN users u ON u.id = t.user_id
SET t.broadcaster_id = u.broadcaster_id
WHERE t.broadcaster_id IS NULL
  AND u.broadcaster_id IS NOT NULL;

DROP PROCEDURE IF EXISTS add_fk_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;
DROP PROCEDURE IF EXISTS add_column_if_missing;
