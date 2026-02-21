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

// Tabela de histórico de alterações de veículos
export const veiculoHistorico = mysqlTable("veiculo_historico", {
  id: int("id").autoincrement().primaryKey(),
  veiculoId: int("veiculoId").notNull(),
  // Tipo de evento: status_change, cliente_change, localizacao_change, observacao_change, criado, editado
  tipo: varchar("tipo", { length: 64 }).notNull(),
  // Campo que foi alterado
  campo: varchar("campo", { length: 64 }),
  // Valor anterior
  valorAnterior: text("valorAnterior"),
  // Novo valor
  valorNovo: text("valorNovo"),
  // Usuário que fez a alteração
  usuarioNome: varchar("usuarioNome", { length: 256 }),
  usuarioId: int("usuarioId"),
  // Observação livre
  observacao: text("observacao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VeiculoHistorico = typeof veiculoHistorico.$inferSelect;
export type InsertVeiculoHistorico = typeof veiculoHistorico.$inferInsert;

// Tabela de colaboradores convidados (acesso somente leitura)
export const colaboradores = mysqlTable("colaboradores", {
  id: int("id").autoincrement().primaryKey(),
  // Nome do colaborador
  nome: varchar("nome", { length: 256 }).notNull(),
  // Email do colaborador
  email: varchar("email", { length: 320 }).notNull().unique(),
  // Papel: colaborador (somente leitura) ou admin
  role: mysqlEnum("role", ["colaborador", "admin"]).default("colaborador").notNull(),
  // Status: ativo ou inativo
  status: mysqlEnum("status", ["ativo", "inativo"]).default("ativo").notNull(),
  // ID do usuário Manus (preenchido após aceitar convite)
  userId: int("userId"),
  // Quem convidou
  convidadoPor: varchar("convidadoPor", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastAccessAt: timestamp("lastAccessAt"),
});

export type Colaborador = typeof colaboradores.$inferSelect;
export type InsertColaborador = typeof colaboradores.$inferInsert;

// Tabela de tokens de convite
export const invites = mysqlTable("invites", {
  id: int("id").autoincrement().primaryKey(),
  // Token único do convite
  token: varchar("token", { length: 128 }).notNull().unique(),
  // Email do convidado
  email: varchar("email", { length: 320 }).notNull(),
  // Nome do convidado
  nome: varchar("nome", { length: 256 }).notNull(),
  // Papel que será atribuído
  role: mysqlEnum("role", ["colaborador", "admin"]).default("colaborador").notNull(),
  // Status do convite
  status: mysqlEnum("status", ["pendente", "aceito", "expirado", "revogado"]).default("pendente").notNull(),
  // Quem gerou o convite
  criadoPor: varchar("criadoPor", { length: 256 }),
  // Data de expiração (7 dias por padrão)
  expiresAt: timestamp("expiresAt").notNull(),
  // Data em que foi aceito
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;
