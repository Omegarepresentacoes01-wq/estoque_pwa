import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import {
  getVeiculos, getVeiculoById, createVeiculo, deleteVeiculo,
  getDashboardStats, getVeiculosFiltros, getVeiculosCriticos, marcarNotificado,
  getProgramacao, createProgramacao, updateProgramacao, deleteProgramacao, getProgramacaoFiltros,
  bulkImportVeiculos, bulkImportProgramacao,
  addHistorico, getHistoricoByVeiculoId, updateVeiculoComHistorico,
  getColaboradores, getColaboradorByEmail, getColaboradorByUserId,
  upsertColaborador, updateColaboradorStatus, deleteColaborador, updateColaboradorLastAccess,
  createInvite, getInviteByToken, getInvites, acceptInvite, revokeInvite, expireOldInvites,
} from "./db";
import { ENV } from "./_core/env";

// ─── Schemas ────────────────────────────────────────────────────────────────

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

// ─── Middleware de autorização ───────────────────────────────────────────────

// Procedure que exige que o usuário seja admin (dono do projeto)
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores.' });
  }
  return next({ ctx });
});

// ─── Router principal ────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(async (opts) => {
      const user = opts.ctx.user;
      if (!user) return null;
      // Verificar se é colaborador registrado e retornar dados enriquecidos
      const colaborador = await getColaboradorByUserId(user.id);
      if (colaborador) {
        // Atualizar último acesso
        await updateColaboradorLastAccess(user.id);
        return {
          ...user,
          colaboradorRole: colaborador.role, // 'colaborador' | 'admin'
          colaboradorNome: colaborador.nome,
          isColaborador: true,
          canEdit: colaborador.role === 'admin',
        };
      }
      // Usuário dono (admin nativo do Manus OAuth)
      return {
        ...user,
        colaboradorRole: 'admin' as const,
        colaboradorNome: user.name,
        isColaborador: false,
        canEdit: true,
      };
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ VEÍCULOS (leitura pública, escrita protegida) ============
  veiculos: router({
    list: publicProcedure.input(VeiculoFiltersSchema).query(async ({ input }) => {
      return getVeiculos(input);
    }),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const v = await getVeiculoById(input.id);
      if (!v) throw new TRPCError({ code: 'NOT_FOUND', message: 'Veículo não encontrado' });
      return v;
    }),

    update: protectedProcedure.input(z.object({ id: z.number(), data: VeiculoInputSchema.partial() })).mutation(async ({ input, ctx }) => {
      // Verificar se tem permissão de edição
      const colaborador = await getColaboradorByUserId(ctx.user.id);
      if (colaborador && colaborador.role === 'colaborador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Colaboradores não podem editar veículos.' });
      }
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

    addHistorico: protectedProcedure.input(z.object({
      veiculoId: z.number(),
      tipo: z.string(),
      campo: z.string().optional(),
      valorAnterior: z.string().optional().nullable(),
      valorNovo: z.string().optional().nullable(),
      observacao: z.string().optional().nullable(),
    })).mutation(async ({ input, ctx }) => {
      const colaborador = await getColaboradorByUserId(ctx.user.id);
      if (colaborador && colaborador.role === 'colaborador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Colaboradores não podem registrar alterações.' });
      }
      await addHistorico({
        ...input,
        usuarioNome: ctx.user?.name ?? 'Sistema',
        usuarioId: ctx.user?.id ?? 0,
      });
      return { success: true };
    }),

    create: protectedProcedure.input(VeiculoInputSchema).mutation(async ({ input, ctx }) => {
      const colaborador = await getColaboradorByUserId(ctx.user.id);
      if (colaborador && colaborador.role === 'colaborador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Colaboradores não podem adicionar veículos.' });
      }
      await createVeiculo(input as any);
      return { success: true };
    }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const colaborador = await getColaboradorByUserId(ctx.user.id);
      if (colaborador && colaborador.role === 'colaborador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Colaboradores não podem excluir veículos.' });
      }
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

    create: protectedProcedure.input(ProgramacaoInputSchema).mutation(async ({ input, ctx }) => {
      const colaborador = await getColaboradorByUserId(ctx.user.id);
      if (colaborador && colaborador.role === 'colaborador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Colaboradores não podem adicionar programações.' });
      }
      await createProgramacao(input as any);
      return { success: true };
    }),

    update: protectedProcedure.input(z.object({ id: z.number(), data: ProgramacaoInputSchema.partial() })).mutation(async ({ input, ctx }) => {
      const colaborador = await getColaboradorByUserId(ctx.user.id);
      if (colaborador && colaborador.role === 'colaborador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Colaboradores não podem editar programações.' });
      }
      await updateProgramacao(input.id, input.data as any);
      return { success: true };
    }),

    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const colaborador = await getColaboradorByUserId(ctx.user.id);
      if (colaborador && colaborador.role === 'colaborador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Colaboradores não podem excluir programações.' });
      }
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
    processarExcel: protectedProcedure.input(z.object({
      veiculos: z.array(VeiculoInputSchema),
      programacao: z.array(ProgramacaoInputSchema),
      modo: z.enum(['substituir', 'adicionar']).default('adicionar'),
    })).mutation(async ({ input, ctx }) => {
      const colaborador = await getColaboradorByUserId(ctx.user.id);
      if (colaborador && colaborador.role === 'colaborador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Colaboradores não podem importar planilhas.' });
      }
      const resultV = await bulkImportVeiculos(input.veiculos as any);
      let resultP = { imported: 0 };
      if (input.programacao.length > 0) {
        resultP = await bulkImportProgramacao(input.programacao as any);
      }
      return { veiculos: resultV, programacao: resultP };
    }),
  }),

  // ============ COLABORADORES (Admin only) ============
  colaboradores: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const colaborador = await getColaboradorByUserId(ctx.user.id);
      // Colaboradores comuns não podem ver a lista de gestão
      if (colaborador && colaborador.role === 'colaborador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito.' });
      }
      return getColaboradores();
    }),

    remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const colaborador = await getColaboradorByUserId(ctx.user.id);
      if (colaborador && colaborador.role === 'colaborador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito.' });
      }
      await deleteColaborador(input.id);
      return { success: true };
    }),

    toggleStatus: protectedProcedure.input(z.object({ id: z.number(), status: z.enum(['ativo', 'inativo']) })).mutation(async ({ input, ctx }) => {
      const colaborador = await getColaboradorByUserId(ctx.user.id);
      if (colaborador && colaborador.role === 'colaborador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito.' });
      }
      await updateColaboradorStatus(input.id, input.status);
      return { success: true };
    }),
  }),

  // ============ CONVITES ============
  convites: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const colaborador = await getColaboradorByUserId(ctx.user.id);
      if (colaborador && colaborador.role === 'colaborador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito.' });
      }
      await expireOldInvites();
      return getInvites();
    }),

    create: protectedProcedure.input(z.object({
      nome: z.string().min(2, 'Nome obrigatório'),
      email: z.string().email('E-mail inválido'),
      role: z.enum(['colaborador', 'admin']).default('colaborador'),
      origin: z.string(), // URL de origem para montar o link
    })).mutation(async ({ input, ctx }) => {
      const colaborador = await getColaboradorByUserId(ctx.user.id);
      if (colaborador && colaborador.role === 'colaborador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito.' });
      }

      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

      // Criar ou atualizar colaborador no banco
      await upsertColaborador({
        nome: input.nome,
        email: input.email.toLowerCase(),
        role: input.role,
        status: 'ativo',
        convidadoPor: ctx.user.name ?? 'Admin',
      });

      // Criar token de convite
      await createInvite({
        token,
        email: input.email.toLowerCase(),
        nome: input.nome,
        role: input.role,
        criadoPor: ctx.user.name ?? 'Admin',
        expiresAt,
      });

      const inviteUrl = `${input.origin}/convite/${token}`;

      // Notificar o dono do projeto
      await notifyOwner({
        title: `👤 Convite enviado para ${input.nome}`,
        content: `Um link de acesso foi gerado para ${input.nome} (${input.email}) com perfil "${input.role}".\n\nLink: ${inviteUrl}\n\nExpira em 7 dias.`,
      });

      return { success: true, token, inviteUrl };
    }),

    getByToken: publicProcedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
      await expireOldInvites();
      const invite = await getInviteByToken(input.token);
      if (!invite) throw new TRPCError({ code: 'NOT_FOUND', message: 'Convite não encontrado.' });
      if (invite.status === 'expirado') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este convite expirou.' });
      if (invite.status === 'revogado') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este convite foi revogado.' });
      return invite;
    }),

    accept: protectedProcedure.input(z.object({ token: z.string() })).mutation(async ({ input, ctx }) => {
      await expireOldInvites();
      const invite = await getInviteByToken(input.token);
      if (!invite) throw new TRPCError({ code: 'NOT_FOUND', message: 'Convite não encontrado.' });
      if (invite.status !== 'pendente') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este convite não está mais disponível.' });

      // Verificar se o email do convite bate com o email do usuário logado
      const userEmail = ctx.user.email?.toLowerCase();
      if (userEmail && invite.email !== userEmail) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Este convite não pertence ao seu e-mail.' });
      }

      await acceptInvite(input.token, ctx.user.id);

      // Notificar o admin
      await notifyOwner({
        title: `✅ ${invite.nome} aceitou o convite`,
        content: `${invite.nome} (${invite.email}) aceitou o convite e agora tem acesso ao sistema como "${invite.role}".`,
      });

      return { success: true, role: invite.role, nome: invite.nome };
    }),

    revoke: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const colaborador = await getColaboradorByUserId(ctx.user.id);
      if (colaborador && colaborador.role === 'colaborador') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito.' });
      }
      await revokeInvite(input.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
