-- database/schema.sql
-- Esquema de Base de Datos para LobitosGames
-- Sistema de gestión de catálogo de animes y videojuegos

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS lobitosgames_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE lobitosgames_db;

-- ====================
-- TABLA: usuarios
-- Almacena información de los usuarios del sistema
-- ====================
CREATE TABLE usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500) DEFAULT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_ultima_sesion TIMESTAMP NULL,
  activo BOOLEAN DEFAULT TRUE,
  INDEX idx_username (username),
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- ====================
-- TABLA: animes
-- Catálogo de animes (puede poblarse desde API o manualmente)
-- ====================
CREATE TABLE animes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  mal_id INT UNIQUE COMMENT 'ID de MyAnimeList',
  titulo VARCHAR(300) NOT NULL,
  titulo_ingles VARCHAR(300),
  año INT,
  episodios INT,
  genero VARCHAR(200),
  rating DECIMAL(3,1),
  sinopsis TEXT,
  imagen_url VARCHAR(500),
  estado VARCHAR(50) COMMENT 'Airing, Finished, Upcoming',
  studio VARCHAR(200),
  fuente VARCHAR(100),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_titulo (titulo(100)),
  INDEX idx_genero (genero(100)),
  INDEX idx_rating (rating)
) ENGINE=InnoDB;

-- ====================
-- TABLA: videojuegos
-- Catálogo de videojuegos (puede poblarse desde API o manualmente)
-- ====================
CREATE TABLE videojuegos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  rawg_id INT UNIQUE COMMENT 'ID de RAWG API',
  titulo VARCHAR(300) NOT NULL,
  año INT,
  plataformas TEXT COMMENT 'JSON array de plataformas',
  genero VARCHAR(200),
  rating DECIMAL(3,1),
  sinopsis TEXT,
  imagen_url VARCHAR(500),
  metacritic INT,
  desarrolladores VARCHAR(300),
  publicadores VARCHAR(300),
  fecha_lanzamiento DATE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_titulo (titulo(100)),
  INDEX idx_genero (genero(100)),
  INDEX idx_rating (rating)
) ENGINE=InnoDB;

-- ====================
-- TABLA: listas_usuario
-- Relación entre usuarios y sus animes/videojuegos
-- ====================
CREATE TABLE listas_usuario (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  tipo_media ENUM('anime', 'videojuego') NOT NULL,
  media_id INT NOT NULL COMMENT 'ID del anime o videojuego',
  tipo_lista ENUM('favoritos', 'viendo', 'jugando', 'considerando', 'completado', 'dropeado') NOT NULL,
  calificacion_personal DECIMAL(3,1) DEFAULT NULL,
  notas TEXT,
  fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizado TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_media (usuario_id, tipo_media, media_id),
  INDEX idx_usuario_tipo (usuario_id, tipo_lista),
  INDEX idx_media (tipo_media, media_id)
) ENGINE=InnoDB;

-- ====================
-- TABLA: favoritos_rapidos
-- Tabla auxiliar para acceso rápido a favoritos
-- ====================
CREATE TABLE favoritos_rapidos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  tipo_media ENUM('anime', 'videojuego') NOT NULL,
  media_id INT NOT NULL,
  fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  UNIQUE KEY unique_favorito (usuario_id, tipo_media, media_id),
  INDEX idx_usuario (usuario_id)
) ENGINE=InnoDB;

-- ====================
-- TABLA: historial_busquedas
-- Almacena búsquedas de usuarios para mejorar recomendaciones
-- ====================
CREATE TABLE historial_busquedas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT,
  termino_busqueda VARCHAR(200) NOT NULL,
  tipo_media ENUM('anime', 'videojuego', 'ambos') DEFAULT 'ambos',
  fecha_busqueda TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_usuario_fecha (usuario_id, fecha_busqueda DESC)
) ENGINE=InnoDB;

-- ====================
-- TABLA: configuracion_usuario
-- Preferencias y configuraciones de usuario
-- ====================
CREATE TABLE configuracion_usuario (
  usuario_id INT PRIMARY KEY,
  tema VARCHAR(20) DEFAULT 'oscuro',
  idioma VARCHAR(10) DEFAULT 'es',
  notificaciones_email BOOLEAN DEFAULT TRUE,
  mostrar_estadisticas BOOLEAN DEFAULT TRUE,
  privacidad_listas ENUM('publico', 'amigos', 'privado') DEFAULT 'publico',
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ====================
-- VISTAS ÚTILES
-- ====================

-- Vista: Estadísticas por usuario
CREATE VIEW vista_estadisticas_usuario AS
SELECT 
  u.id AS usuario_id,
  u.username,
  COUNT(CASE WHEN lu.tipo_media = 'anime' THEN 1 END) AS total_animes,
  COUNT(CASE WHEN lu.tipo_media = 'videojuego' THEN 1 END) AS total_videojuegos,
  COUNT(CASE WHEN lu.tipo_lista = 'favoritos' THEN 1 END) AS total_favoritos,
  COUNT(CASE WHEN lu.tipo_lista = 'viendo' THEN 1 END) AS animes_viendo,
  COUNT(CASE WHEN lu.tipo_lista = 'jugando' THEN 1 END) AS juegos_jugando,
  COUNT(CASE WHEN lu.tipo_lista = 'completado' THEN 1 END) AS total_completados,
  AVG(lu.calificacion_personal) AS calificacion_promedio
FROM usuarios u
LEFT JOIN listas_usuario lu ON u.id = lu.usuario_id
GROUP BY u.id, u.username;

-- Vista: Top animes más agregados a listas
CREATE VIEW vista_top_animes AS
SELECT 
  a.id,
  a.titulo,
  a.rating,
  a.genero,
  COUNT(lu.id) AS total_en_listas,
  COUNT(CASE WHEN lu.tipo_lista = 'favoritos' THEN 1 END) AS total_favoritos
FROM animes a
LEFT JOIN listas_usuario lu ON a.id = lu.media_id AND lu.tipo_media = 'anime'
GROUP BY a.id, a.titulo, a.rating, a.genero
ORDER BY total_en_listas DESC;

-- Vista: Top videojuegos más agregados a listas
CREATE VIEW vista_top_videojuegos AS
SELECT 
  v.id,
  v.titulo,
  v.rating,
  v.genero,
  COUNT(lu.id) AS total_en_listas,
  COUNT(CASE WHEN lu.tipo_lista = 'favoritos' THEN 1 END) AS total_favoritos
FROM videojuegos v
LEFT JOIN listas_usuario lu ON v.id = lu.media_id AND lu.tipo_media = 'videojuego'
GROUP BY v.id, v.titulo, v.rating, v.genero
ORDER BY total_en_listas DESC;

-- ====================
-- PROCEDIMIENTOS ALMACENADOS
-- ====================

-- Procedimiento: Agregar a lista
DELIMITER //
CREATE PROCEDURE agregar_a_lista(
  IN p_usuario_id INT,
  IN p_tipo_media ENUM('anime', 'videojuego'),
  IN p_media_id INT,
  IN p_tipo_lista ENUM('favoritos', 'viendo', 'jugando', 'considerando', 'completado', 'dropeado')
)
BEGIN
  -- Remover de otras listas si existe
  DELETE FROM listas_usuario 
  WHERE usuario_id = p_usuario_id 
    AND tipo_media = p_tipo_media 
    AND media_id = p_media_id;
  
  -- Agregar a la nueva lista
  INSERT INTO listas_usuario (usuario_id, tipo_media, media_id, tipo_lista)
  VALUES (p_usuario_id, p_tipo_media, p_media_id, p_tipo_lista);
  
  -- Si es favorito, agregar a favoritos_rapidos
  IF p_tipo_lista = 'favoritos' THEN
    INSERT IGNORE INTO favoritos_rapidos (usuario_id, tipo_media, media_id)
    VALUES (p_usuario_id, p_tipo_media, p_media_id);
  END IF;
END //
DELIMITER ;

-- Procedimiento: Obtener listas de usuario
DELIMITER //
CREATE PROCEDURE obtener_listas_usuario(IN p_usuario_id INT)
BEGIN
  SELECT 
    tipo_lista,
    tipo_media,
    COUNT(*) AS cantidad
  FROM listas_usuario
  WHERE usuario_id = p_usuario_id
  GROUP BY tipo_lista, tipo_media;
END //
DELIMITER ;

-- ====================
-- TRIGGERS
-- ====================

-- Trigger: Crear configuración por defecto al registrar usuario
DELIMITER //
CREATE TRIGGER crear_configuracion_usuario
AFTER INSERT ON usuarios
FOR EACH ROW
BEGIN
  INSERT INTO configuracion_usuario (usuario_id)
  VALUES (NEW.id);
END //
DELIMITER ;

-- Trigger: Actualizar fecha_ultima_sesion
DELIMITER //
CREATE TRIGGER actualizar_ultima_sesion
AFTER UPDATE ON usuarios
FOR EACH ROW
BEGIN
  IF NEW.activo = TRUE AND OLD.activo = FALSE THEN
    UPDATE usuarios SET fecha_ultima_sesion = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END IF;
END //
DELIMITER ;

-- ====================
-- ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ====================

-- Índices compuestos para búsquedas frecuentes
CREATE INDEX idx_listas_usuario_filtros ON listas_usuario(usuario_id, tipo_lista, tipo_media);
CREATE INDEX idx_animes_busqueda ON animes(titulo(100), genero(50), rating);
CREATE INDEX idx_videojuegos_busqueda ON videojuegos(titulo(100), genero(50), rating);

-- ====================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ====================

-- Insertar un usuario de prueba
INSERT INTO usuarios (username, email, password_hash, nombre, apellido) 
VALUES ('admin', 'admin@lobitosgames.com', '$2b$10$example_hash', 'Admin', 'Sistema');

-- Comentario: Los datos de animes y videojuegos se poblarán desde las APIs
-- o se pueden importar manualmente según sea necesario