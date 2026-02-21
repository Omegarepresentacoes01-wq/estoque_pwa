import { createConnection } from 'mysql2/promise';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import XLSX from 'xlsx';
import { config } from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '../.env') });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

// Parse the URL, stripping query params from database name
const rawMatch = DB_URL.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
const match = rawMatch;
if (!match) { console.error('Invalid DATABASE_URL'); process.exit(1); }
const [, user, password, host, port, database] = match;
console.log(`Connecting to ${host}:${port}/${database}`);

const conn = await createConnection({ host, port: parseInt(port), user, password, database: database.split('?')[0], charset: 'utf8mb4', ssl: { rejectUnauthorized: true } });

const EXCEL_FILE = '/home/ubuntu/upload/PLANILHA(19.02.2026).xlsx';
if (!existsSync(EXCEL_FILE)) { console.error('Excel file not found:', EXCEL_FILE); process.exit(1); }

const wb = XLSX.readFile(EXCEL_FILE);

const safeStr = (v, max) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === 'null' || s === 'undefined') return null;
  return max ? s.slice(0, max) : s;
};

const safeInt = (v) => {
  if (v === null || v === undefined) return null;
  const n = parseInt(String(v));
  return isNaN(n) ? null : n;
};

const safeDate = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  const s = String(v).trim();
  if (!s || s === 'null') return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
};

const safeStatus = (v) => {
  const s = safeStr(v);
  if (!s) return 'LIVRE';
  const u = s.toUpperCase();
  if (u.includes('RESERVADO')) return 'RESERVADO';
  if (u.includes('VENDIDO')) return 'VENDIDO';
  return 'LIVRE';
};

// ===== ESTOQUE GERAL =====
console.log('\n=== Importing ESTOQUE GERAL ===');
const ws = wb.Sheets['ESTOQUE GERAL '];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

let headerIdx = -1;
for (let i = 0; i < raw.length; i++) {
  if (raw[i] && raw[i].some(c => String(c || '').trim() === 'NF')) {
    headerIdx = i; break;
  }
}
if (headerIdx === -1) { console.error('Header row not found'); process.exit(1); }

let count = 0, errors = 0;
for (let i = headerIdx + 1; i < raw.length; i++) {
  const row = raw[i];
  if (!row || row.every(c => c === null || c === undefined || String(c).trim() === '')) continue;
  const num = safeInt(row[0]);
  if (num === null) continue;
  try {
    await conn.execute(
      `INSERT INTO veiculos (numero, nf, dataEmissao, cod, modelo, anoMod, cor, chassi, dataChegadaCovezi, dataAtual, status, diasEstoque, diasPatio, cliente, estoquesFisico, observacao, implemento, pneu, defletor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [num, safeStr(row[1],32), safeDate(row[2]), safeStr(row[3],32), safeStr(row[4]), safeStr(row[5],16), safeStr(row[6],64), safeStr(row[7],32), safeDate(row[8]), safeDate(row[9]), safeStatus(row[10]), safeInt(row[11]), safeInt(row[12]), safeStr(row[13],256), safeStr(row[14],128), safeStr(row[15]), safeStr(row[16],128), safeStr(row[17],64), safeStr(row[18],64)]
    );
    count++;
  } catch (e) {
    errors++;
    if (errors <= 3) console.error(`  Row ${num} error:`, e.message);
  }
}
console.log(`Veículos importados: ${count} | Erros: ${errors}`);

// ===== PROGRAMAÇÃO =====
console.log('\n=== Importing PROGRAMAÇÃO ===');
const ws2 = wb.Sheets['PROGRAMAÇAO ATE JUNHO  2026'];
const raw2 = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: null });

let hIdx2 = -1;
for (let i = 0; i < raw2.length; i++) {
  if (raw2[i] && raw2[i].some(c => String(c || '').trim() === 'PEDIDO')) {
    hIdx2 = i; break;
  }
}
if (hIdx2 === -1) { console.error('Header row not found for programacao'); process.exit(1); }

let count2 = 0, errors2 = 0;
for (let i = hIdx2 + 1; i < raw2.length; i++) {
  const row = raw2[i];
  if (!row || row.every(c => c === null || c === undefined || String(c).trim() === '')) continue;
  const pedido = safeStr(row[0], 32);
  if (!pedido) continue;
  try {
    await conn.execute(
      `INSERT INTO programacao (pedido, idModelo, mesPrevisto, modelo, cor, local) VALUES (?,?,?,?,?,?)`,
      [pedido, safeStr(row[1],32), safeStr(row[2],32), safeStr(row[3]), safeStr(row[4],64), safeStr(row[5],128)]
    );
    count2++;
  } catch (e) {
    errors2++;
    if (errors2 <= 3) console.error(`  Row ${pedido} error:`, e.message);
  }
}
console.log(`Programações importadas: ${count2} | Erros: ${errors2}`);

await conn.end();
console.log('\n✅ Importação concluída!');
