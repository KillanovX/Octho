# Octho — Gestão de Tarefas & Horas

Dashboard de tarefas e horas da equipe: Kanban, timer, registro de horas com data, reuniões, projetos, relatórios e administração de usuários. Integra com o vault Obsidian (chamados, atas do Granola e worklog) via Hermes Agent.

A documentação completa (SSOT e plano de integração) fica no vault: `Vibe Coding/octho/ssot.md` e `Vibe Coding/octho/plano.md`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn · Supabase (Auth + Postgres com RLS) · Vercel Analytics.

## Configuração

1. `pnpm install`
2. Copie `.env.local.example` para `.env.local` e preencha as variáveis.
3. No Supabase, aplique `supabase/schema.sql` (projeto novo) e depois `supabase/migrations/*.sql` em ordem.
4. Em Supabase Auth, configure o SMTP (ex: Resend) para o e-mail de recuperação de senha e adicione `<sua-url>/reset-password` às Redirect URLs.

| Variável | Onde | Uso |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | cliente | URL do projeto |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | cliente | chave pública (aceita também `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `SUPABASE_SERVICE_ROLE_KEY` | servidor | painel Admin e API do agente |
| `OCTHO_AGENT_TOKEN` | servidor | token do Hermes Agent (32+ caracteres) |
| `OCTHO_AGENT_USER_ID` | servidor | usuário em nome de quem o agente grava |
| `NEXT_PUBLIC_OBSIDIAN_VAULT` | cliente | nome do vault para o link "Abrir no Obsidian" (padrão `Brain`) |

## Acesso e papéis

- Não há cadastro público na interface: contas são criadas no painel **Administração**.
- Papéis em `profiles.role`: `pending` (sem acesso aos dados), `member`, `admin`. Quem se cadastrar direto pela API do Supabase entra como `pending` até um admin aprovar.
- Todas as permissões são aplicadas no banco (RLS) e nas rotas de servidor; o front só esconde o que o usuário não pode usar.

## Horas

`time_entries` é a fonte única das horas (timer, reunião, manual, agente). `tasks.hours_logged` é recalculado por trigger. Relatórios e Registro de horas filtram por período a partir desses lançamentos; o CSV inclui a coluna de horas para apontamento ITSM (blocos de 30 min, arredondados para cima).

## Apontamento ITSM

- **Tarefa > Apontamento ITSM:** sessões no formato do worklog do vault (`### DD-MM-AAAA | HH:MM-HH:MM (0.5h) | Título`) e minuta para o SControl, com cópia em um clique.
- **Fechamento do dia:** horas faturáveis (tarefas com chamado) e internas, sessões e minutas por chamado, e alertas (timer ligado, lançamento sem tarefa, sessão sem horário).
- **Timer:** inicia no card do Kanban, no modal da tarefa ou com `T`; ao registrar pede "o que foi feito" (vira o título no worklog); avisa quando passa de 2h e mostra o tempo no título da aba.

## Atalhos

`N` nova tarefa · `T` timer · `/` ou `Ctrl K` busca · `?` lista de atalhos · `G` e depois `D` dashboard, `K` Kanban, `H` horas, `F` fechamento, `R` relatórios, `I` caixa de entrada, `M` minhas tarefas, `P` projetos, `U` reuniões, `C` configurações.

## Tempo real

Tarefas, horas, reuniões e o feed chegam via Supabase Realtime (respeitando o RLS); cards alterados por outra pessoa ou pelo Hermes piscam por alguns segundos.

## Rotas de servidor

| Rota | Auth | Função |
| :--- | :--- | :--- |
| `GET/POST /api/admin/users` | JWT do Supabase + papel admin | listar, criar, renomear, alterar papel, trocar senha, excluir |
| `GET /api/agent/sync?since=ISO` | `Bearer OCTHO_AGENT_TOKEN` | export incremental de tarefas, reuniões e lançamentos |
| `POST /api/agent/sync` | `Bearer OCTHO_AGENT_TOKEN` | upsert idempotente de `tasks` (externalRef), `meetings` (granolaId), `timeEntries` (externalId) |

## Sincronização com o vault

```bash
node scripts/vault-sync.mjs push --dry-run   # mostra o que seria enviado
node scripts/vault-sync.mjs push             # chamados, atas e worklog -> Octho
node scripts/vault-sync.mjs pull             # Octho -> Entrada/AAAA-MM-DD Octho export.md
```

Variáveis: `OCTHO_URL`, `OCTHO_AGENT_TOKEN`, `OBSIDIAN_VAULT`.

## Comandos

```bash
pnpm dev        # desenvolvimento
pnpm build      # build de produção (falha em erros de TypeScript)
pnpm typecheck
pnpm lint
```
