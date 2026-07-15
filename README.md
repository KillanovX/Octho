# Fluxo — Gestão de Tarefas & Horas

Este documento serve como a **Fonte de Verdade (Source of Truth)** do aplicativo **Fluxo**, consolidando todos os detalhes sobre a arquitetura, stack tecnológica, estrutura de dados, componentes de interface e regras de negócio.

---

## 🚀 Visão Geral do Projeto

O **Fluxo** é um dashboard de gestão de tarefas e horas projetado para equipes de desenvolvimento e design. Ele permite acompanhar o andamento de demandas em um quadro Kanban, contabilizar horas trabalhadas em tempo real via cronômetro ativo, gerenciar múltiplos usuários com sessões isoladas de dados e visualizar estatísticas e métricas de produtividade.

---

## 🛠️ Stack Tecnológica

O projeto foi construído utilizando as seguintes tecnologias modernas:

1. **Framework Principal:** [Next.js 16.2.6](https://nextjs.org/) (com React 19) e suporte nativo a React Server Components (RSC) e TypeScript.
2. **Estilização & Temas:** [Tailwind CSS v4.2.0](https://tailwindcss.com/) com uso extensivo de variáveis de ambiente baseadas no sistema de cores **OKLCH**, garantindo suporte fluido e nativo para temas claro e escuro (*Light & Dark Mode*).
3. **Animações:** [tw-animate-css](https://github.com/) integrado nas classes utilitárias de transição.
4. **Ícones:** [Lucide React](https://lucide.dev/) para todos os elementos gráficos e indicativos.
5. **Biblioteca de UI:** [Shadcn UI](https://ui.shadcn.com/) (usando a configuração `base-nova` otimizada para Tailwind CSS v4).
6. **Métricas & Analytics:** Integração com `@vercel/analytics` para ambientes de produção.

---

## 📂 Estrutura de Diretórios

A estrutura organizada do repositório é detalhada abaixo:

```text
dashboard-de-gestao/
├── app/                      # Rotas e Páginas do Next.js (App Router)
│   ├── globals.css           # Variáveis CSS customizadas (OKLCH), temas e estilos globais
│   ├── layout.tsx            # Layout raiz (configura com AppProvider, fontes, metadados e Vercel Analytics)
│   └── page.tsx              # Página inicial principal do Dashboard (Client Component)
├── components/               # Componentes de interface modulares (Client Components reativos)
│   ├── ui/                   # Primitivos de UI reaproveitáveis (Shadcn)
│   │   └── button.tsx        # Botão customizado com variantes de estilo
│   ├── activity-breakdown.tsx# Distribuição mensal de horas por atividade (barra empilhada do usuário ativo)
│   ├── activity-feed.tsx     # Linha do tempo com atividades recentes do usuário ativo
│   ├── dashboard-header.tsx  # Cabeçalho com saudação dinâmica, data atual e cronômetro em tempo real
│   ├── kanban-board.tsx      # Quadro Kanban com colunas e cards de tarefas do usuário ativo
│   ├── sidebar.tsx           # Barra de navegação lateral (Workspace e seletor popover de usuário)
│   ├── stat-cards.tsx        # Indicadores numéricos de desempenho reativos do usuário ativo
│   └── weekly-hours-chart.tsx# Gráfico SVG interativo de linha/área das horas semanais do usuário
├── lib/                      # Utilitários e armazenamento de dados
│   ├── context.tsx           # Contexto React (AppProvider / useApp) para controle de sessão e dados isolados
│   ├── data.ts               # Tipagens básicas do TypeScript e arrays estáticos de exemplo (mock)
│   └── utils.ts              # Função utilitária cn (Tailwind Merge + Clsx)
├── public/                   # Recursos estáticos (Logos, ícones de aba e imagens)
├── components.json           # Configuração de componentes Shadcn (estilo base-nova)
├── package.json              # Script de build, dependências do projeto e metadados
└── tsconfig.json             # Configuração do compilador TypeScript
```

---

## 📊 Estrutura e Modelagem de Dados

Toda a tipagem e dados do Fluxo residem em [lib/data.ts](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/lib/data.ts) e [lib/context.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/lib/context.tsx).

### 1. Tipos de Dados Básicos
* **`Priority`**: Nível de prioridade das tarefas ([lib/data.ts#L1](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/lib/data.ts#L1)).
  ```typescript
  type Priority = "urgent" | "high" | "medium" | "low" | "none"
  ```
* **`ColumnId`**: Identificadores das colunas do quadro Kanban ([lib/data.ts#L3](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/lib/data.ts#L3)).
  ```typescript
  type ColumnId = "backlog" | "todo" | "in_progress" | "done"
  ```
* **`Label`**: Rótulo para categorização de tarefas (ex: Frontend, Design, Bug) ([lib/data.ts#L5](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/lib/data.ts#L5)).
  ```typescript
  type Label = {
    name: string;
    color: string;
  }
  ```

### 2. Perfis de Usuário (`UserProfile`)
Define os metadados dos perfis mapeados no sistema ([lib/context.tsx#L12](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/lib/context.tsx#L12)):
```typescript
type UserProfile = {
  id: string;            // Ex: "MA", "FA"
  name: string;          // Nome completo do usuário
  email: string;         // E-mail corporativo
  avatar: string;        // Iniciais do avatar
  avatarColor: string;   // Cor de fundo do círculo do avatar
}
```

### 3. Modelo de Dados de Usuário (`UserData`)
Contém o estado isolado dos dados de cada perfil ([lib/context.tsx#L35](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/lib/context.tsx#L35)):
```typescript
type UserData = {
  tasks: Task[];
  weeklyHours: typeof sampleWeeklyHours;
  activityBreakdown: typeof sampleActivityBreakdown;
  activityFeed: ActivityEvent[];
  hoursMonth: number;
  completedTasksMonth: number;
}
```

---

## 🔄 Estado Global & Troca de Sessões

O controle de sessão é feito via **React Context** ([lib/context.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/lib/context.tsx)). A aplicação inicializa os dados de forma isolada para cada perfil:

1. **Marina Alves (`MA` - Usuário Teste):** Carrega as 15 tarefas pré-definidas no Kanban, histórico de horas da semana ativa (Seg a Sáb), distribuição de atividades do mês e feed com histórico recente de comentários e movimentações.
2. **Flavio Alves (`FA` - Usuário Real):** Inicializado sem dados de exemplo. O Kanban começa vazio, as horas do mês/semana são iniciadas em zero e o feed de atividades encontra-se limpo.

O estado do aplicativo é mantido sob um dicionário no React, garantindo que as modificações e interações efetuadas sob a sessão de um usuário não sejam perdidas ou vazadas para o outro ao alternar entre perfis.

---

## 🎨 Componentes e Interface do Usuário

### 1. Barra Lateral ([components/sidebar.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/components/sidebar.tsx))
* **Seletor de Workspace**: Botão decorativo para alterar o espaço ativo com ícone `Zap`.
* **Caixa de Busca**: Atalho visual (simulação de `⌘K`).
* **Menu de Navegação Principal**: *Dashboard*, *Caixa de entrada* (com badge de `8` mensagens) e *Minhas tarefas*.
* **Menu de Workspace**: Links rápidos para *Quadro Kanban*, *Projetos*, *Registro de horas* e *Relatórios*.
* **Menu de Troca de Usuários (Rodapé)**: 
  * Clicar sobre o perfil do usuário abre um popover suspenso flutuante (`absolute z-50`).
  * O popover exibe a lista de usuários cadastrados (**Marina Alves** e **Flavio Alves**) permitindo a alternância de perfil em tempo real com um clique.

### 2. Cabeçalho ([components/dashboard-header.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/components/dashboard-header.tsx))
* **Saudação Dinâmica**: Mostra "Bom dia, [Nome]" correspondendo ao usuário logado no momento e a data atual por extenso (`pt-BR`).
* **Cronômetro de Tarefa Ativa**:
  * Funcionalidade de temporizador em tempo real atualizado a cada 1 segundo via React `useEffect`.
  * Rastreia a tarefa ativa **FLX-243** por padrão (inicializado em 2h 14m), permitindo pausar e retomar a contagem.

### 3. Cartões de Estatísticas ([components/stat-cards.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/components/stat-cards.tsx))
Calcula dinamicamente as métricas com base no usuário selecionado:
* **Horas hoje**: Busca as horas do dia da semana atual com base na tabela semanal do usuário ativo, formatando no padrão `Xh Ym` (ex: `8.1h` vira `8h 6m`).
* **Horas no mês**: Lê o total mensal de horas do usuário atual.
* **Tarefas concluídas**: Mostra a estatística de demandas concluídas no mês.
* **Tarefas ativas**: Mostra a contagem de tarefas em aberto (`tasks.filter(t => t.column !== 'done')`) detalhando dinamicamente quantas estão *a fazer* e *em progresso*.
* **Tendências**: Exibe tendências percentuais comparativas para o usuário Marina Alves e esconde o bloco de tendências para Flavio Alves exibindo o aviso "Sem dados".

### 4. Gráfico Semanal ([components/weekly-hours-chart.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/components/weekly-hours-chart.tsx))
* Gráfico de linhas e área desenhado em **SVG nativo** reativo à semana ativa do usuário logado.
* Desenha um gradiente de preenchimento (`#areaFill`) sob a linha de horas.
* Apresenta uma linha tracejada horizontal de referência indicando a meta padrão de 8 horas diárias.
* Calcula dinamicamente o total de horas acumulado e a média diária de horas registradas.

### 5. Distribuição de Atividades ([components/activity-breakdown.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/components/activity-breakdown.tsx))
* Exibe a divisão percentual e em horas das atividades desenvolvidas durante o mês atual (Frontend, Design, Backend, Conteúdo, Reuniões).
* Utiliza uma barra horizontal empilhada colorida dinamicamente baseada nos pesos das horas de cada item. 
* Contém validação para evitar erros de divisão por zero quando as horas do usuário são `0` (exibe uma barra de estado cinza vazia e percentual `0%`).

### 6. Quadro Kanban ([components/kanban-board.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/components/kanban-board.tsx))
Renderiza os cards de tarefas nas quatro colunas de fluxo: *Backlog*, *A fazer*, *Em progresso* e *Concluído*.
* Cada coluna exibe a contagem de itens e a soma total de horas logadas nas tarefas contidas ali.
* Exibe um placeholder pontilhado com a mensagem "Sem tarefas" para colunas vazias.

### 7. Feed de Atividade ([components/activity-feed.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/components/activity-feed.tsx))
* Linha do tempo vertical exibindo as últimas interações. 
* Mapeia as iniciais do banco de dados para nomes completos reais (`MA` $\rightarrow$ Marina, `JS` $\rightarrow$ João, `FA` $\rightarrow$ Flavio, `RP` $\rightarrow$ Rafa).
* Exibe um placeholder amigável se o usuário não possuir eventos.

---

## 🎨 Sistema de Cores e Estilos (OKLCH)

O aplicativo adota a nova especificação de cores **OKLCH** definida no [app/globals.css](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/app/globals.css). As variáveis principais mapeadas são:

| Variável | OKLCH (Light Mode) | OKLCH (Dark Mode) | Uso Comum |
| :--- | :--- | :--- | :--- |
| `--background` | `1 0 0` | `0.145 0 0` | Fundo principal da página |
| `--foreground` | `0.145 0 0` | `0.985 0 0` | Texto padrão do sistema |
| `--card` | `1 0 0` | `0.205 0 0` | Fundo de componentes estruturais |
| `--primary` | `0.55 0.2 258` | `0.62 0.19 258` | Destaque principal, botões e foco |
| `--border` | `0.922 0 0` | `1 0 0 / 10%` | Bordas e separadores |
| `--chart-4` | `0.65 0.17 145` | `0.68 0.17 145` | Indicativo de progresso bem-sucedido |

---

## 🛠️ Comandos de Execução

No terminal, você pode rodar os seguintes comandos usando `npm` ou `pnpm`:

* **Instalar dependências:**
  ```bash
  npm install
  ```
* **Iniciar Ambiente de Desenvolvimento:**
  ```bash
  npm run dev
  ```
* **Compilar para Produção:**
  ```bash
  npm run build
  ```
* **Iniciar Servidor de Produção (pós-build):**
  ```bash
  npm run start
  ```
* **Executar Linter de Código:**
  ```bash
  npm run lint
  ```
