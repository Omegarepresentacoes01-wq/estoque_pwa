import { trpc } from "@/lib/trpc";

/**
 * Hook que retorna as permissões do usuário logado.
 * - canEdit: true se for admin (dono) ou colaborador com role 'admin'
 * - isAdmin: true apenas para o dono do projeto (Manus OAuth owner)
 * - isColaborador: true se entrou via link de convite
 * - nome: nome de exibição do usuário
 */
export function usePermissions() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  const canEdit = user?.canEdit ?? false;
  const isColaborador = user?.isColaborador ?? false;
  const colaboradorRole = user?.colaboradorRole ?? 'colaborador';
  const nome = user?.colaboradorNome ?? user?.name ?? '';
  const email = user?.email ?? '';
  const isAuthenticated = !!user;

  return {
    isLoading,
    isAuthenticated,
    canEdit,
    isColaborador,
    colaboradorRole,
    nome,
    email,
    user,
  };
}
