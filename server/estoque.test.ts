import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Contexto de teste simulando usuário admin autenticado via JWT próprio
// O ctx.user é o User do Manus (não usado no novo sistema), mas precisamos
// passar um req com cookie válido. Para testes unitários, usamos req mockado
// e as procedures que chamam getOwnUser vão retornar null (sem cookie).
// Para procedures que não precisam de auth, isso é suficiente.
function createCtx(overrides?: Partial<TrpcContext>): TrpcContext {
  return {
    user: null, // Novo sistema não usa ctx.user do Manus
    req: {
      protocol: "https",
      headers: { cookie: "" },
      hostname: "localhost",
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
      cookie: () => {},
    } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const cleared: any[] = [];
    const ctx = createCtx({
      res: { clearCookie: (name: string, opts: any) => cleared.push({ name, opts }) } as any,
    });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(cleared).toHaveLength(1);
    expect(cleared[0].name).toBe("app_session_id");
  });
});

describe("auth.me", () => {
  it("returns null when no session cookie", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("veiculos router", () => {
  it("list returns paginated data structure", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.veiculos.list({ page: 1, pageSize: 5 });
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.total).toBe("number");
    expect(result.total).toBeGreaterThan(0);
  });

  it("list filters by status LIVRE", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.veiculos.list({ status: "LIVRE", page: 1, pageSize: 10 });
    expect(result.data.every((v: any) => v.status === "LIVRE")).toBe(true);
  });

  it("list filters by status RESERVADO", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.veiculos.list({ status: "RESERVADO", page: 1, pageSize: 10 });
    expect(result.data.every((v: any) => v.status === "RESERVADO")).toBe(true);
  });

  it("list respects pageSize", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.veiculos.list({ page: 1, pageSize: 3 });
    expect(result.data.length).toBeLessThanOrEqual(3);
  });

  it("filtros returns arrays", async () => {
    const caller = appRouter.createCaller(createCtx());
    const filtros = await caller.veiculos.filtros();
    expect(Array.isArray(filtros.locais)).toBe(true);
    expect(Array.isArray(filtros.cores)).toBe(true);
    expect(Array.isArray(filtros.pneus)).toBe(true);
    expect(filtros.locais.length).toBeGreaterThan(0);
  });
});

describe("dashboard router", () => {
  it("stats returns expected shape", async () => {
    const caller = appRouter.createCaller(createCtx());
    const stats = await caller.dashboard.stats();
    expect(stats).not.toBeNull();
    expect(stats?.totais).toBeDefined();
    expect(stats?.porLocal).toBeDefined();
    expect(stats?.porStatus).toBeDefined();
    expect(Number(stats?.totais?.total)).toBeGreaterThan(0);
  });
});

describe("programacao router", () => {
  it("list returns paginated data", async () => {
    const caller = appRouter.createCaller(createCtx());
    const result = await caller.programacao.list({ page: 1, pageSize: 5 });
    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("total");
    expect(result.total).toBeGreaterThan(0);
  });

  it("filtros returns meses and locais", async () => {
    const caller = appRouter.createCaller(createCtx());
    const filtros = await caller.programacao.filtros();
    expect(Array.isArray(filtros.meses)).toBe(true);
    expect(Array.isArray(filtros.locais)).toBe(true);
    expect(filtros.meses.length).toBeGreaterThan(0);
  });
});

describe("convites router", () => {
  it("getByToken throws NOT_FOUND for invalid token", async () => {
    const caller = appRouter.createCaller(createCtx());
    await expect(caller.convites.getByToken({ token: "invalid-token-xyz" }))
      .rejects.toThrow();
  });
});
