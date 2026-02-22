import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in environment');
  process.exit(1);
}

// Parse the URL
const url = new URL(DATABASE_URL);
const host = url.hostname;
const port = parseInt(url.port || '3306');
const user = url.username;
const password = url.password;
const database = url.pathname.slice(1).split('?')[0];
const ssl = DATABASE_URL.includes('ssl') ? { rejectUnauthorized: false } : undefined;

const EMAIL = 'omegarepresentacoes01@gmail.com';
const SENHA = 'ale2026';
const NOME = 'Administrador';

async function main() {
  const conn = await mysql.createConnection({ host, port, user, password, database, ssl });

  // Hash da senha
  const passwordHash = await bcrypt.hash(SENHA, 12);

  // Verificar se já existe
  const [rows] = await conn.execute(
    'SELECT id FROM colaboradores WHERE email = ?',
    [EMAIL]
  );

  if (rows.length > 0) {
    // Atualizar senha e garantir role admin
    await conn.execute(
      'UPDATE colaboradores SET passwordHash = ?, role = "admin", status = "ativo", nome = ? WHERE email = ?',
      [passwordHash, NOME, EMAIL]
    );
    console.log(`✅ Admin atualizado: ${EMAIL}`);
  } else {
    // Inserir novo admin
    await conn.execute(
      `INSERT INTO colaboradores (nome, email, role, status, passwordHash, createdAt, updatedAt)
       VALUES (?, ?, 'admin', 'ativo', ?, NOW(), NOW())`,
      [NOME, EMAIL, passwordHash]
    );
    console.log(`✅ Admin criado: ${EMAIL}`);
  }

  await conn.end();
  console.log('✅ Concluído!');
}

main().catch(err => {
  console.error('Erro:', err.message);
  process.exit(1);
});
