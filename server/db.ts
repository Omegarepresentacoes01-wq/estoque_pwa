import { and, asc, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, InsertVeiculo, InsertProgramacao, InsertVeiculoHistorico, users, veiculos, programacao, veiculoHistorico } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot get user: database not available"); return undefined; }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ VEÍCULOS ============

export interface VeiculoFilters {
  search?: string;
  status?: string;
  estoquesFisico?: string;
  cor?: string;
  pneu?: string;
  cod?: string;
  diasEstoqueMin?: number;
  diasEstoqueMax?: number;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export async function getVeiculos(filters: VeiculoFilters = {}) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };

  const {
    search, status, estoquesFisico, cor, pneu, cod,
    diasEstoqueMin, diasEstoqueMax,
    page = 1, pageSize = 50,
    orderBy = 'numero', orderDir = 'asc'
  } = filters;

  const conditions = [];

  if (search) {
    const s = `%${search}%`;
    conditions.push(
      or(
        like(veiculos.nf, s),
        like(veiculos.chassi, s),
        like(veiculos.modelo, s),
        like(veiculos.cliente, s),
        like(veiculos.cod, s),
        like(veiculos.estoquesFisico, s),
      )
    );
  }
  if (status && status !== 'TODOS') conditions.push(eq(veiculos.status, status as any));
  if (estoquesFisico && estoquesFisico !== 'TODOS') conditions.push(like(veiculos.estoquesFisico, `%${estoquesFisico}%`));
  if (cor && cor !== 'TODOS') conditions.push(like(veiculos.cor, `%${cor}%`));
  if (pneu && pneu !== 'TODOS') conditions.push(like(veiculos.pneu, `%${pneu}%`));
  if (cod && cod !== 'TODOS') conditions.push(eq(veiculos.cod, cod));
  if (diasEstoqueMin !== undefined) conditions.push(gte(veiculos.diasEstoque, diasEstoqueMin));
  if (diasEstoqueMax !== undefined) conditions.push(lte(veiculos.diasEstoque, diasEstoqueMax));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(veiculos).where(where);
  const total = Number(countResult?.count ?? 0);

  const offset = (page - 1) * pageSize;
  const orderCol = (veiculos as any)[orderBy] ?? veiculos.numero;
  const orderFn = orderDir === 'desc' ? desc : asc;

  const data = await db.select().from(veiculos).where(where).orderBy(orderFn(orderCol)).limit(pageSize).offset(offset);

  return { data, total };
}

export async function getVeiculoById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(veiculos).where(eq(veiculos.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createVeiculo(data: InsertVeiculo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(veiculos).values(data);
}

export async function updateVeiculo(id: number, data: Partial<InsertVeiculo>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(veiculos).set(data).where(eq(veiculos.id, id));
}

export async function deleteVeiculo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(veiculos).where(eq(veiculos.id, id));
}

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const [totais] = await db.select({
    total: sql<number>`count(*)`,
    livres: sql<number>`sum(case when status = 'LIVRE' then 1 else 0 end)`,
    reservados: sql<number>`sum(case when status = 'RESERVADO' then 1 else 0 end)`,
    vendidos: sql<number>`sum(case when status = 'VENDIDO' then 1 else 0 end)`,
    diasMedioEstoque: sql<number>`avg(abs(diasEstoque))`,
    diasMedioPatio: sql<number>`avg(diasPatio)`,
    criticos: sql<number>`sum(case when abs(diasEstoque) > 180 then 1 else 0 end)`,
  }).from(veiculos);

  const porLocal = await db.select({
    local: veiculos.estoquesFisico,
    count: sql<number>`count(*)`,
  }).from(veiculos).groupBy(veiculos.estoquesFisico).orderBy(desc(sql`count(*)`)).limit(10);

  const porStatus = await db.select({
    status: veiculos.status,
    count: sql<number>`count(*)`,
  }).from(veiculos).groupBy(veiculos.status);

  const porCor = await db.select({
    cor: veiculos.cor,
    count: sql<number>`count(*)`,
  }).from(veiculos).groupBy(veiculos.cor).orderBy(desc(sql`count(*)`)).limit(8);

  const porPneu = await db.select({
    pneu: veiculos.pneu,
    count: sql<number>`count(*)`,
  }).from(veiculos).where(sql`pneu is not null and pneu != ''`).groupBy(veiculos.pneu).orderBy(desc(sql`count(*)`));

  const criticos = await db.select().from(veiculos)
    .where(and(sql`abs(diasEstoque) > 180`, eq(veiculos.status, 'LIVRE')))
    .orderBy(asc(veiculos.diasEstoque))
    .limit(10);

  return { totais, porLocal, porStatus, porCor, porPneu, criticos };
}

export async function getVeiculosFiltros() {
  const db = await getDb();
  if (!db) return { locais: [], cores: [], pneus: [], codigos: [] };

  const locais = await db.selectDistinct({ val: veiculos.estoquesFisico }).from(veiculos)
    .where(sql`estoquesFisico is not null and estoquesFisico != ''`).orderBy(asc(veiculos.estoquesFisico));
  const cores = await db.selectDistinct({ val: veiculos.cor }).from(veiculos)
    .where(sql`cor is not null and cor != ''`).orderBy(asc(veiculos.cor));
  const pneus = await db.selectDistinct({ val: veiculos.pneu }).from(veiculos)
    .where(sql`pneu is not null and pneu != ''`).orderBy(asc(veiculos.pneu));
  const codigos = await db.selectDistinct({ val: veiculos.cod }).from(veiculos)
    .where(sql`cod is not null and cod != ''`).orderBy(asc(veiculos.cod));

  return {
    locais: locais.map(r => r.val).filter(Boolean),
    cores: cores.map(r => r.val).filter(Boolean),
    pneus: pneus.map(r => r.val).filter(Boolean),
    codigos: codigos.map(r => r.val).filter(Boolean),
  };
}

export async function getVeiculosCriticos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(veiculos)
    .where(and(sql`abs(diasEstoque) > 180`, eq(veiculos.status, 'LIVRE'), eq(veiculos.notificado, 'nao')))
    .orderBy(asc(veiculos.diasEstoque));
}

export async function marcarNotificado(ids: number[]) {
  const db = await getDb();
  if (!db) return;
  for (const id of ids) {
    await db.update(veiculos).set({ notificado: 'sim' }).where(eq(veiculos.id, id));
  }
}

// ============ PROGRAMAÇÃO ============

export interface ProgramacaoFilters {
  search?: string;
  mesPrevisto?: string;
  local?: string;
  page?: number;
  pageSize?: number;
}

export async function getProgramacao(filters: ProgramacaoFilters = {}) {
  const db = await getDb();
  if (!db) return { data: [], total: 0 };

  const { search, mesPrevisto, local, page = 1, pageSize = 50 } = filters;
  const conditions = [];

  if (search) {
    const s = `%${search}%`;
    conditions.push(or(like(programacao.pedido, s), like(programacao.modelo, s), like(programacao.cor, s), like(programacao.local, s)));
  }
  if (mesPrevisto && mesPrevisto !== 'TODOS') conditions.push(eq(programacao.mesPrevisto, mesPrevisto));
  if (local && local !== 'TODOS') conditions.push(like(programacao.local, `%${local}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(programacao).where(where);
  const total = Number(countResult?.count ?? 0);

  const offset = (page - 1) * pageSize;
  const data = await db.select().from(programacao).where(where).orderBy(asc(programacao.mesPrevisto), asc(programacao.id)).limit(pageSize).offset(offset);

  return { data, total };
}

export async function createProgramacao(data: InsertProgramacao) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(programacao).values(data);
}

export async function updateProgramacao(id: number, data: Partial<InsertProgramacao>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(programacao).set(data).where(eq(programacao.id, id));
}

export async function deleteProgramacao(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(programacao).where(eq(programacao.id, id));
}

export async function getProgramacaoFiltros() {
  const db = await getDb();
  if (!db) return { meses: [], locais: [] };

  const meses = await db.selectDistinct({ val: programacao.mesPrevisto }).from(programacao)
    .where(sql`mesPrevisto is not null and mesPrevisto != ''`).orderBy(asc(programacao.mesPrevisto));
  const locais = await db.selectDistinct({ val: programacao.local }).from(programacao)
    .where(sql`local is not null and local != ''`).orderBy(asc(programacao.local));

  return {
    meses: meses.map(r => r.val).filter(Boolean),
    locais: locais.map(r => r.val).filter(Boolean),
  };
}

export async function bulkImportVeiculos(rows: InsertVeiculo[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let imported = 0, skipped = 0;
  const errors: string[] = [];
  for (const row of rows) {
    try {
      await db.insert(veiculos).values(row).onDuplicateKeyUpdate({ set: { updatedAt: new Date() } });
      imported++;
    } catch (e: any) {
      skipped++;
      errors.push(e.message);
    }
  }
  return { imported, skipped, errors: errors.slice(0, 10) };
}

export async function bulkImportProgramacao(rows: InsertProgramacao[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(programacao);
  let imported = 0;
  for (const row of rows) {
    await db.insert(programacao).values(row);
    imported++;
  }
  return { imported };
}

// ============ HISTÓRICO DE VEÍCULOS ============

export async function addHistorico(entry: InsertVeiculoHistorico) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(veiculoHistorico).values(entry);
}

export async function getHistoricoByVeiculoId(veiculoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(veiculoHistorico)
    .where(eq(veiculoHistorico.veiculoId, veiculoId))
    .orderBy(desc(veiculoHistorico.createdAt));
}

export async function updateVeiculoComHistorico(
  id: number,
  data: Partial<InsertVeiculo>,
  usuarioNome: string,
  usuarioId: number,
  veiculoAtual: Partial<InsertVeiculo>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Campos que queremos rastrear no histórico
  const camposRastreados: Array<keyof InsertVeiculo> = [
    'status', 'cliente', 'estoquesFisico', 'observacao',
    'implemento', 'pneu', 'defletor', 'diasEstoque', 'diasPatio',
    'dataChegadaCovezi', 'dataAtual', 'cor', 'anoMod',
  ];

  // Registrar uma entrada de histórico por campo alterado
  for (const campo of camposRastreados) {
    const valorAnterior = veiculoAtual[campo];
    const valorNovo = data[campo];
    if (valorNovo !== undefined && String(valorNovo) !== String(valorAnterior ?? '')) {
      const tipo = campo === 'status' ? 'status_change'
        : campo === 'cliente' ? 'cliente_change'
        : campo === 'estoquesFisico' ? 'localizacao_change'
        : 'campo_change';
      await db.insert(veiculoHistorico).values({
        veiculoId: id,
        tipo,
        campo,
        valorAnterior: valorAnterior != null ? String(valorAnterior) : null,
        valorNovo: valorNovo != null ? String(valorNovo) : null,
        usuarioNome,
        usuarioId,
      });
    }
  }

  // Atualizar o veículo
  await db.update(veiculos).set(data).where(eq(veiculos.id, id));
}
