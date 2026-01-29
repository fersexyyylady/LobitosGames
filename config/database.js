// config/database.js
// Configuración de conexión a la base de datos MySQL
// Este archivo está preparado para cuando se implemente la base de datos

const dbConfig = {
  development: {
    host: "localhost",
    port: 3306,
    user: "root",
    password: "", // Cambiar en producción
    database: "lobitosgames_db",
    connectionLimit: 10,
    queueLimit: 0,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  },
  production: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "lobitosgames_db",
    connectionLimit: 10,
    queueLimit: 0,
    waitForConnections: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  },
};

// Determinar el ambiente actual
const environment = process.env.NODE_ENV || "development";

// Exportar la configuración según el ambiente
module.exports = dbConfig[environment];

// Función para crear el pool de conexiones (para uso futuro)
// const mysql = require('mysql2/promise');
// const pool = mysql.createPool(dbConfig[environment]);
// module.exports = { pool, config: dbConfig[environment] };
