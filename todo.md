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
- [x] Tabela `invites` no banco (token, email, nome, role, usado, expirado)
- [x] Tabela `colaboradores` com email, nome, role (admin/colaborador)
- [x] Router tRPC: invites.create, invites.accept, invites.list, invites.revoke
- [x] Router tRPC: colaboradores.list, colaboradores.remove, colaboradores.changeRole
- [x] Login de colaborador via link de convite (com definição de senha)
- [x] Middleware de autorização: Admin vs Colaborador
- [x] Bloquear mutations no frontend para Colaborador (botões ocultos/desabilitados)
- [x] Página de gerenciamento de colaboradores (Admin only)
- [x] Exibir nome do usuário logado no Dashboard
- [x] Página de aceite de convite (/convite/:token)
- [x] Notificação ao admin quando colaborador aceitar convite

## Bugs (v7)
- [x] Corrigir gráfico pizza "Distribuição por Marca de Pneu" cortado no mobile

## Autenticação Própria por E-mail (v8)
- [x] Tabela de sessões JWT próprias no banco (bcrypt + JWT)
- [x] Backend: login com e-mail + senha (sem dependência de e-mail externo)
- [x] Backend: validar senha com bcrypt e criar sessão JWT própria
- [x] Tela de login com campo e-mail + senha
- [x] Middleware de sessão independente do OAuth Manus
- [x] Admin cadastrado no banco com e-mail omegarepresentacoes01@gmail.com
- [x] Colaboradores acessam via convite por link e definem senha no primeiro acesso

## Guia de Instalação PWA (v9)
- [x] Página de instruções visuais para instalar como app no Android e iOS
- [x] Link no menu lateral para a página de instruções

## Exportação PDF (v10)
- [x] Botão "Baixar PDF" na página de detalhes do veículo
- [x] PDF com logo Covezi Iveco, todos os campos e histórico de alterações

## Controle de Acesso - Ajustes (v11)
- [x] Ocultar botão "Editar" na página de detalhes do veículo para colaboradores (somente Admin pode editar)

## Correcção PDF (v12)
- [x] Corrigir letras cortadas e alinhamento de texto no PDF gerado

## Correcção Importação (v13)
- [x] Importação de planilha deve substituir os dados existentes, não acumular (nova planilha = fonte de verdade)
