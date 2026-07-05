# Sistema de Controle de Estoque — Oficina Automotiva

Sistema web completo para controle de estoque com interface intuitiva.

## Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Shadcn/UI, React Query
- **Backend:** Node.js, Express, TypeScript, Prisma
- **Banco:** PostgreSQL
- **Auth:** JWT + bcrypt

## Início rápido

### Pré-requisitos

- Node.js 20+
- PostgreSQL 16+ (ou Docker)

### Com Docker

```bash
cp .env.example .env
docker compose up -d
```

**Acesse:** http://127.0.0.1:8888

> **Windows:** use `127.0.0.1` em vez de `localhost` (conflito IPv6 com Docker Desktop).
> Atalho: dê duplo clique em `abrir-sistema.bat`

### Desenvolvimento local

```bash
# Instalar dependências
npm install

# Subir banco
docker compose up db -d

# Configurar ambiente
cp .env.example .env

# Gerar Prisma e migrar
npm run db:generate
npm run migrate:dev -w @estoque/api
npm run seed

# Iniciar dev
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

### Login padrão

- **E-mail:** admin@oficina.local
- **Senha:** admin123

## Módulos

- Dashboard com indicadores e gráficos
- Produtos, categorias, fornecedores
- Estoque com localização, lote e validade
- 11 tipos de movimentação
- Compras com sugestão inteligente
- Relatórios (PDF, Excel, CSV)
- Usuários com permissões (RBAC)
- Notificações em tempo real
- Backup automático e manual
- Logs de auditoria
