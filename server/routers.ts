import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { notifyOwner } from "./_core/notification";
import {
  getVeiculos, getVeiculoById, createVeiculo, deleteVeiculo,
  getDashboardStats, getVeiculosFiltros, getVeiculosCriticos, marcarNotificado,
  getProgramacao, createProgramacao, updateProgramacao, deleteProgramacao, getProgramacaoFiltros,
  bulkImportVeiculos, bulkImportProgramacao,
  addHistorico, getHistoricoByVeiculoId, updateVeiculoComHistorico,
  getColaboradores, getColaboradorByEmail, getColaboradorById,
  upsertColaborador, updateColaboradorStatus, deleteColaborador, updateColaboradorLastAccess,
  setColaboradorPassword,
  createInvite, getInviteByToken, getInvites, acceptInvite, revokeInvite, expireOldInvites,
} from "./db";
import { hashPassword, verifyPassword, createToken, authenticateOwnRequest } from "./auth";

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

// ─── Helpers de contexto próprio ────────────────────────────────────────────

type OwnUser = {
  id: number;
  email: string;
  nome: string;
  role: "admin" | "colaborador";
};

// Extrai o usuário autenticado pelo JWT próprio (não usa ctx.user do Manus)
async function getOwnUser(req: any): Promise<OwnUser | null> {
  const payload = await authenticateOwnRequest(req);
  if (!payload) return null;
  return {
    id: parseInt(payload.sub),
    email: payload.email,
    nome: payload.nome,
    role: payload.role,
  };
}

function requireAdmin(user: OwnUser | null): asserts user is OwnUser {
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Faça login para continuar.' });
  if (user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores.' });
}

function requireAuth(user: OwnUser | null): asserts user is OwnUser {
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Faça login para continuar.' });
}

// ─── Router principal ────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  // ============ AUTH PRÓPRIO ============
  auth: router({
    me: publicProcedure.query(async ({ ctx }) => {
      const user = await getOwnUser(ctx.req);
      if (!user) return null;
      await updateColaboradorLastAccess(user.id);
      return {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
        canEdit: user.role === 'admin',
      };
    }),

    login: publicProcedure.input(z.object({
      email: z.string().email('E-mail inválido'),
      password: z.string().min(1, 'Senha obrigatória'),
    })).mutation(async ({ input, ctx }) => {
      const colaborador = await getColaboradorByEmail(input.email.toLowerCase());
      if (!colaborador) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'E-mail ou senha incorretos.' });
      }
      if (colaborador.status === 'inativo') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sua conta está inativa. Contate o administrador.' });
      }
      if (!colaborador.passwordHash) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Senha não definida. Use o link de convite para criar sua senha.' });
      }
      const valid = await verifyPassword(input.password, colaborador.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'E-mail ou senha incorretos.' });
      }
      const token = await createToken({
        sub: String(colaborador.id),
        email: colaborador.email,
        nome: colaborador.nome,
        role: colaborador.role,
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
      });
      await updateColaboradorLastAccess(colaborador.id);
      return {
        success: true,
        user: {
          id: colaborador.id,
          email: colaborador.email,
          nome: colaborador.nome,
          role: colaborador.role,
          canEdit: colaborador.role === 'admin',
        },
      };
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Definir senha ao aceitar convite
    setPassword: publicProcedure.input(z.object({
      token: z.string(),
      password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    })).mutation(async ({ input, ctx }) => {
      await expireOldInvites();
      const invite = await getInviteByToken(input.token);
      if (!invite) throw new TRPCError({ code: 'NOT_FOUND', message: 'Convite não encontrado.' });
      if (invite.status === 'expirado') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este convite expirou.' });
      if (invite.status === 'revogado') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Este convite foi revogado.' });

      const colaborador = await getColaboradorByEmail(invite.email);
      if (!colaborador) throw new TRPCError({ code: 'NOT_FOUND', message: 'Colaborador não encontrado.' });

      const passwordHash = await hashPassword(input.password);
      await setColaboradorPassword(colaborador.id, passwordHash);
      await acceptInvite(input.token);

      // Login automático após definir senha
      const jwtToken = await createToken({
        sub: String(colaborador.id),
        email: colaborador.email,
        nome: colaborador.nome,
        role: invite.role,
      });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, jwtToken, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      await notifyOwner({
        title: `✅ ${invite.nome} ativou o acesso`,
        content: `${invite.nome} (${invite.email}) definiu sua senha e agora tem acesso ao sistema como "${invite.role}".`,
      });

      return {
        success: true,
        user: { id: colaborador.id, email: colaborador.email, nome: colaborador.nome, role: invite.role, canEdit: invite.role === 'admin' },
      };
    }),

    // Alterar própria senha (usuário logado)
    changePassword: publicProcedure.input(z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(6, 'Nova senha deve ter pelo menos 6 caracteres'),
    })).mutation(async ({ input, ctx }) => {
      const user = await getOwnUser(ctx.req);
      requireAuth(user);
      const colaborador = await getColaboradorById(user.id);
      if (!colaborador || !colaborador.passwordHash) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Senha atual não definida.' });
      }
      const valid = await verifyPassword(input.currentPassword, colaborador.passwordHash);
      if (!valid) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Senha atual incorreta.' });
      const newHash = await hashPassword(input.newPassword);
      await setColaboradorPassword(user.id, newHash);
      return { success: true };
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
      const user = await getOwnUser(ctx.req);
      requireAdmin(user);
      const veiculoAtual = await getVeiculoById(input.id);
      if (!veiculoAtual) throw new TRPCError({ code: 'NOT_FOUND', message: 'Veículo não encontrado' });
      await updateVeiculoComHistorico(input.id, input.data as any, user.nome, user.id, veiculoAtual);
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
      const user = await getOwnUser(ctx.req);
      requireAdmin(user);
      await addHistorico({
        ...input,
        usuarioNome: user.nome,
        usuarioId: user.id,
      });
      return { success: true };
    }),

    create: publicProcedure.input(VeiculoInputSchema).mutation(async ({ input, ctx }) => {
      const user = await getOwnUser(ctx.req);
      requireAdmin(user);
      await createVeiculo(input as any);
      return { success: true };
    }),

    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const user = await getOwnUser(ctx.req);
      requireAdmin(user);
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

    create: publicProcedure.input(ProgramacaoInputSchema).mutation(async ({ input, ctx }) => {
      const user = await getOwnUser(ctx.req);
      requireAdmin(user);
      await createProgramacao(input as any);
      return { success: true };
    }),

    update: publicProcedure.input(z.object({ id: z.number(), data: ProgramacaoInputSchema.partial() })).mutation(async ({ input, ctx }) => {
      const user = await getOwnUser(ctx.req);
      requireAdmin(user);
      await updateProgramacao(input.id, input.data as any);
      return { success: true };
    }),

    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const user = await getOwnUser(ctx.req);
      requireAdmin(user);
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
    })).mutation(async ({ input, ctx }) => {
      const user = await getOwnUser(ctx.req);
      requireAdmin(user);
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
    list: publicProcedure.query(async ({ ctx }) => {
      const user = await getOwnUser(ctx.req);
      requireAdmin(user);
      return getColaboradores();
    }),

    remove: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const user = await getOwnUser(ctx.req);
      requireAdmin(user);
      await deleteColaborador(input.id);
      return { success: true };
    }),

    toggleStatus: publicProcedure.input(z.object({ id: z.number(), status: z.enum(['ativo', 'inativo']) })).mutation(async ({ input, ctx }) => {
      const user = await getOwnUser(ctx.req);
      requireAdmin(user);
      await updateColaboradorStatus(input.id, input.status);
      return { success: true };
    }),
  }),

  // ============ CONVITES ============
  convites: router({
    list: publicProcedure.query(async ({ ctx }) => {
      const user = await getOwnUser(ctx.req);
      requireAdmin(user);
      await expireOldInvites();
      return getInvites();
    }),

    create: publicProcedure.input(z.object({
      nome: z.string().min(2, 'Nome obrigatório'),
      email: z.string().email('E-mail inválido'),
      role: z.enum(['colaborador', 'admin']).default('colaborador'),
      origin: z.string(),
    })).mutation(async ({ input, ctx }) => {
      const user = await getOwnUser(ctx.req);
      requireAdmin(user);

      const token = nanoid(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await upsertColaborador({
        nome: input.nome,
        email: input.email.toLowerCase(),
        role: input.role,
        status: 'ativo',
        convidadoPor: user.nome,
      });

      await createInvite({
        token,
        email: input.email.toLowerCase(),
        nome: input.nome,
        role: input.role,
        criadoPor: user.nome,
        expiresAt,
      });

      const inviteUrl = `${input.origin}/convite/${token}`;

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

    revoke: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
      const user = await getOwnUser(ctx.req);
      requireAdmin(user);
      await revokeInvite(input.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
