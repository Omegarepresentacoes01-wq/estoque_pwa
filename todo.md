# Sistema de Gestão de Estoque - TODO

## Schema e Banco de Dados
- [x] Criar tabela `veiculos` no schema Drizzle
- [x] Criar tabela `programacao` no schema Drizzle
- [x] Gerar e aplicar migration SQL
- [x] Script de importação dos dados da planilha Excel (468 veículos + 300 programações)

## Backend (tRPC Routers)
- [x] Router `veiculos`: list, getById, create, update, delete, bulkImport
- [x] Router `programacao`: list, create, update, delete
- [x] Router `dashboard`: stats (totais, por status, por local, dias médios)
- [x] Router `notificacoes`: verificar veículos críticos e notificar owner
- [x] Router `importacao`: upload e processamento de planilha Excel
- [x] Exportação CSV embutida nas queries

## Frontend - Layout e Navegação
- [x] Tema elegante dark navy com paleta de cores refinada
- [x] DashboardLayout com sidebar de navegação (Dashboard, Estoque, Programação, Importação)
- [x] Configurar PWA (manifest.json, service worker, ícones)

## Frontend - Páginas
- [x] Dashboard principal com estatísticas e gráficos (pie, bar charts)
- [x] Página de Estoque Geral com tabela interativa e paginação
- [x] Página de Programação de Chegadas com resumo por mês
- [x] Página de Importação de planilha Excel

## Funcionalidades Avançadas
- [x] Filtros avançados: status, localização, cor, pneu, faixa de dias
- [x] Busca global por NF, chassi, modelo, cliente, código
- [x] Formulário de adição de novo veículo
- [x] Formulário de edição de veículo existente
- [x] Exportação de dados filtrados para CSV
- [x] Upload de planilha Excel para atualização em lote
- [x] Validação e prévia antes da importação
- [x] Notificações automáticas: veículos > 180 dias em estoque
- [x] Suporte offline PWA (service worker + cache via vite-plugin-pwa)
- [x] Ordenação de colunas na tabela de estoque

## Testes
- [x] Testes unitários para routers principais (10 testes passando)
- [x] Verificação de status do servidor

## Melhorias UI/UX (v2)
- [x] Implementar modo claro com paleta refinada
- [x] Bordas mais visíveis/negrito no modo claro
- [x] Toggle de tema claro/escuro no header/sidebar
- [x] Corrigir sidebar mobile: overlay, swipe, botão fechar
- [x] Tabelas responsivas no mobile (scroll horizontal + colunas prioritárias)
- [x] Filtros em drawer/bottom-sheet no mobile
- [x] Formulários de CRUD adaptados para mobile
- [x] Bottom navigation bar no mobile
- [x] Dashboard cards responsivos em mobile
- [x] Melhorar tipografia e espaçamento geral

## Bugs (v3)
- [x] Corrigir problema de login (autenticação não funciona)
- [x] Investigar e corrigir acesso após publicação (login OAuth não funciona)

## Página de Detalhes do Veículo (v4)
- [x] Tabela veiculo_historico no banco de dados
- [x] Router tRPC: veiculos.getById, veiculos.historico, veiculos.addHistorico
- [x] Página VeiculoDetalhe.tsx com todas as informações
- [x] Timeline de histórico de alterações de status
- [x] Ações rápidas: Reservar, Liberar, Marcar como Vendido (via modal de edição)
- [x] Link de detalhes na tabela de estoque e nos cards mobile
- [x] Registro automático de histórico ao editar status/cliente

## Controle de Acesso por Perfil (v5)
- [ ] Tabela `invites` no banco (token, email, nome, role, usado, expirado)
- [ ] Tabela `colaboradores` com email, nome, role (admin/colaborador)
- [ ] Router tRPC: invites.create, invites.accept, invites.list, invites.revoke
- [ ] Router tRPC: colaboradores.list, colaboradores.remove, colaboradores.changeRole
- [ ] Login de colaborador via link de convite (sem senha, somente email+nome)
- [ ] Middleware de autorização: Admin vs Colaborador
- [ ] Bloquear mutations no frontend para Colaborador (botões ocultos/desabilitados)
- [ ] Página de gerenciamento de colaboradores (Admin only)
- [ ] Exibir nome do usuário logado no Dashboard
- [ ] Página de aceite de convite (/convite/:token)
- [ ] Notificação ao admin quando colaborador aceitar convite

## Bugs (v7)
- [x] Corrigir gráfico pizza "Distribuição por Marca de Pneu" cortado no mobile
