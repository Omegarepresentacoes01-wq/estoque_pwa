import {
  bigint,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
  float,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tabela principal de veículos em estoque
export const veiculos = mysqlTable("veiculos", {
  id: int("id").autoincrement().primaryKey(),
  // Número sequencial na planilha
  numero: int("numero"),
  // Nota Fiscal
  nf: varchar("nf", { length: 32 }),
  dataEmissao: date("dataEmissao"),
  // Código do modelo
  cod: varchar("cod", { length: 32 }),
  // Descrição completa do modelo
  modelo: text("modelo"),
  // Ano/Modelo ex: 25/26
  anoMod: varchar("anoMod", { length: 16 }),
  cor: varchar("cor", { length: 64 }),
  chassi: varchar("chassi", { length: 32 }),
  dataChegadaCovezi: date("dataChegadaCovezi"),
  dataAtual: date("dataAtual"),
  status: mysqlEnum("status", ["LIVRE", "RESERVADO", "VENDIDO"]).default("LIVRE").notNull(),
  diasEstoque: int("diasEstoque"),
  diasPatio: int("diasPatio"),
  cliente: varchar("cliente", { length: 256 }),
  estoquesFisico: varchar("estoquesFisico", { length: 128 }),
  observacao: text("observacao"),
  implemento: varchar("implemento", { length: 128 }),
  pneu: varchar("pneu", { length: 64 }),
  defletor: varchar("defletor", { length: 64 }),
  // Controle interno
  notificado: mysqlEnum("notificado", ["nao", "sim"]).default("nao").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Veiculo = typeof veiculos.$inferSelect;
export type InsertVeiculo = typeof veiculos.$inferInsert;

// Tabela de programação de chegadas
export const programacao = mysqlTable("programacao", {
  id: int("id").autoincrement().primaryKey(),
  pedido: varchar("pedido", { length: 32 }),
  idModelo: varchar("idModelo", { length: 32 }),
  mesPrevisto: varchar("mesPrevisto", { length: 32 }),
  modelo: text("modelo"),
  cor: varchar("cor", { length: 64 }),
  local: varchar("local", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Programacao = typeof programacao.$inferSelect;
export type InsertProgramacao = typeof programacao.$inferInsert;
