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
