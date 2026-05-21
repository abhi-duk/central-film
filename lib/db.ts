import mysql from 'mysql2/promise';

declare global {
  // eslint-disable-next-line no-var
  var __centralPool: mysql.Pool | undefined;
}

export function getDb() {
  if (!global.__centralPool) {
    global.__centralPool = mysql.createPool({
      host: process.env.CENTRAL_DB_HOST || process.env.MYSQL_HOST || '127.0.0.1',
      port: Number(process.env.CENTRAL_DB_PORT || process.env.MYSQL_PORT || 3306),
      user: process.env.CENTRAL_DB_USER || process.env.MYSQL_USER || 'root',
      password: process.env.CENTRAL_DB_PASSWORD ?? process.env.MYSQL_PASSWORD ?? '',
      database: process.env.CENTRAL_DB_NAME || process.env.MYSQL_DATABASE || 'film_central',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      timezone: 'Z',
      dateStrings: true,
      multipleStatements: false,
    });
  }
  return global.__centralPool;
}

export function rows<T = any>(value: any): T[] {
  return Array.isArray(value) ? value as T[] : [];
}
