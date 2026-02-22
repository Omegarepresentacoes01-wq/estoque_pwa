import { trpc } from "@/lib/trpc";

/**
 * Hook que retorna as permissões do usuário logado.
 * - canEdit: true se for admin
 * - isAdmin: true se role === 'admin'
 * - nome: nome de exibição do usuário
 */
export function usePermissions() {
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  const canEdit = user?.canEdit ?? false;
  const isAdmin = user?.role === 'admin';
  const nome = user?.nome ?? user?.email ?? '';
  const email = user?.email ?? '';
  const isAuthenticated = !!user;
  const colaboradorRole = user?.role ?? 'colaborador';
  const isColaborador = user?.role === 'colaborador';

  return {
    isLoading,
    isAuthenticated,
    canEdit,
    isAdmin,
    isColaborador,
    colaboradorRole,
    nome,
    email,
    user,
  };
}
