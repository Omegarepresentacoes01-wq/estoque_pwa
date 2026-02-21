import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import {
  getVeiculos, getVeiculoById, createVeiculo, updateVeiculo, deleteVeiculo,
  getDashboardStats, getVeiculosFiltros, getVeiculosCriticos, marcarNotificado,
  getProgramacao, createProgramacao, updateProgramacao, deleteProgramacao, getProgramacaoFiltros,
  bulkImportVeiculos, bulkImportProgramacao,
  addHistorico, getHistoricoByVeiculoId, updateVeiculoComHistorico,
} from "./db";

const VeiculoFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  estoquesFisico: z.string().optional(),
  cor: z.string().optional(),
  pneu: z.string().optional(),
  cod: z.string().optional(),
  diasEstoqueMin: z.number().optional(),
  diasEstoqueMax: z.number().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(50),
  orderBy: z.string().optional(),
  orderDir: z.enum(['asc', 'desc']).optional(),
});

const VeiculoInputSchema = z.object({
  numero: z.number().optional().nullable(),
  nf: z.string().optional().nullable(),
  dataEmissao: z.string().optional().nullable(),
  cod: z.string().optional().nullable(),
  modelo: z.string().optional().nullable(),
  anoMod: z.string().optional().nullable(),
  cor: z.string().optional().nullable(),
  chassi: z.string().optional().nullable(),
  dataChegadaCovezi: z.string().optional().nullable(),
  dataAtual: z.string().optional().nullable(),
  status: z.enum(['LIVRE', 'RESERVADO', 'VENDIDO']).default('LIVRE'),
  diasEstoque: z.number().optional().nullable(),
  diasPatio: z.number().optional().nullable(),
  cliente: z.string().optional().nullable(),
  estoquesFisico: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
  implemento: z.string().optional().nullable(),
  pneu: z.string().optional().nullable(),
  defletor: z.string().optional().nullable(),
});

const ProgramacaoFiltersSchema = z.object({
  search: z.string().optional(),
  mesPrevisto: z.string().optional(),
  local: z.string().optional(),
  page: z.number().default(1),
  pageSize: z.number().default(50),
});

const ProgramacaoInputSchema = z.object({
  pedido: z.string().optional().nullable(),
  idModelo: z.string().optional().nullable(),
  mesPrevisto: z.string().optional().nullable(),
  modelo: z.string().optional().nullable(),
  cor: z.string().optional().nullable(),
  local: z.string().optional().nullable(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ VEÍCULOS ============
  veiculos: router({
    list: publicProcedure.input(VeiculoFiltersSchema).query(async ({ input }) => {
      return getVeiculos(input);
    }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const v = await getVeiculoById(input.id);
      if (!v) throw new TRPCError({ code: 'NOT_FOUND', message: 'Veículo não encontrado' });
      return v;
    }),

    update: publicProcedure.input(z.object({ id: z.number(), data: VeiculoInputSchema.partial() })).mutation(async ({ input, ctx }) => {
      // Buscar veículo atual para comparação no histórico
      const veiculoAtual = await getVeiculoById(input.id);
      if (!veiculoAtual) throw new TRPCError({ code: 'NOT_FOUND', message: 'Veículo não encontrado' });
      const usuarioNome = ctx.user?.name ?? 'Sistema';
      const usuarioId = ctx.user?.id ?? 0;
      await updateVeiculoComHistorico(input.id, input.data as any, usuarioNome, usuarioId, veiculoAtual);
      return { success: true };
    }),

    historico: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return getHistoricoByVeiculoId(input.id);
    }),

    addHistorico: publicProcedure.input(z.object({
      veiculoId: z.number(),
      tipo: z.string(),
      campo: z.string().optional(),
      valorAnterior: z.string().optional().nullable(),
      valorNovo: z.string().optional().nullable(),
      observacao: z.string().optional().nullable(),
    })).mutation(async ({ input, ctx }) => {
      await addHistorico({
        ...input,
        usuarioNome: ctx.user?.name ?? 'Sistema',
        usuarioId: ctx.user?.id ?? 0,
      });
      return { success: true };
    }),

    create: publicProcedure.input(VeiculoInputSchema).mutation(async ({ input, ctx }) => {
      await createVeiculo(input as any);
      return { success: true };
    }),

    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteVeiculo(input.id);
      return { success: true };
    }),

    filtros: publicProcedure.query(async () => {
      return getVeiculosFiltros();
    }),

    exportAll: publicProcedure.input(VeiculoFiltersSchema).query(async ({ input }) => {
      const result = await getVeiculos({ ...input, pageSize: 10000, page: 1 });
      return result.data;
    }),
  }),

  // ============ DASHBOARD ============
  dashboard: router({
    stats: publicProcedure.query(async () => {
      return getDashboardStats();
    }),
  }),

  // ============ PROGRAMAÇÃO ============
  programacao: router({
    list: publicProcedure.input(ProgramacaoFiltersSchema).query(async ({ input }) => {
      return getProgramacao(input);
    }),

    create: publicProcedure.input(ProgramacaoInputSchema).mutation(async ({ input }) => {
      await createProgramacao(input as any);
      return { success: true };
    }),

    update: publicProcedure.input(z.object({ id: z.number(), data: ProgramacaoInputSchema.partial() })).mutation(async ({ input }) => {
      await updateProgramacao(input.id, input.data as any);
      return { success: true };
    }),

    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await deleteProgramacao(input.id);
      return { success: true };
    }),

    filtros: publicProcedure.query(async () => {
      return getProgramacaoFiltros();
    }),

    exportAll: publicProcedure.input(ProgramacaoFiltersSchema).query(async ({ input }) => {
      const result = await getProgramacao({ ...input, pageSize: 10000, page: 1 });
      return result.data;
    }),
  }),

  // ============ NOTIFICAÇÕES ============
  notificacoes: router({
    verificarCriticos: publicProcedure.mutation(async () => {
      const criticos = await getVeiculosCriticos();
      if (criticos.length === 0) return { notificados: 0 };

      const lista = criticos.slice(0, 10).map(v =>
        `• ${v.modelo?.slice(0, 50)} | Chassi: ${v.chassi} | Dias: ${Math.abs(v.diasEstoque ?? 0)} | Local: ${v.estoquesFisico}`
      ).join('\n');

      await notifyOwner({
        title: `⚠️ ${criticos.length} veículo(s) com mais de 180 dias em estoque`,
        content: `Os seguintes veículos ultrapassaram o limite crítico de 180 dias:\n\n${lista}\n\nTotal crítico: ${criticos.length} veículos.`,
      });

      await marcarNotificado(criticos.map(v => v.id));
      return { notificados: criticos.length };
    }),
  }),

  // ============ IMPORTAÇÃO ============
  importacao: router({
    processarExcel: publicProcedure.input(z.object({
      veiculos: z.array(VeiculoInputSchema),
      programacao: z.array(ProgramacaoInputSchema),
      modo: z.enum(['substituir', 'adicionar']).default('adicionar'),
    })).mutation(async ({ input }) => {
      const resultV = await bulkImportVeiculos(input.veiculos as any);
      let resultP = { imported: 0 };
      if (input.programacao.length > 0) {
        resultP = await bulkImportProgramacao(input.programacao as any);
      }
      return {
        veiculos: resultV,
        programacao: resultP,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
