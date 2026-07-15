# Fluxo — Gestão de Tarefas & Horas

Este documento serve como a **Fonte de Verdade (Source of Truth)** do aplicativo **Fluxo**, consolidando todos os detalhes sobre a arquitetura, stack tecnológica, estrutura de dados, componentes de interface e regras de negócio.

---

## 🚀 Visão Geral do Projeto

O **Fluxo** é um dashboard de gestão de tarefas e horas projetado para equipes de desenvolvimento e design. Ele permite acompanhar o andamento de demandas em um quadro Kanban, contabilizar horas trabalhadas em tempo real via cronômetro ativo e visualizar estatísticas e métricas de produtividade.

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
│   ├── layout.tsx            # Layout raiz (configuração de fontes, metadados e Vercel Analytics)
│   └── page.tsx              # Página inicial principal do Dashboard
├── components/               # Componentes de interface modulares
│   ├── ui/                   # Primitivos de UI reaproveitáveis (Shadcn)
│   │   └── button.tsx        # Botão customizado com variantes de estilo
│   ├── activity-breakdown.tsx# Distribuição mensal de horas por atividade (barra empilhada)
│   ├── activity-feed.tsx     # Linha do tempo com atividades recentes do time
│   ├── dashboard-header.tsx  # Cabeçalho com saudação dinâmica, data atual e cronômetro em tempo real
│   ├── kanban-board.tsx      # Quadro Kanban com colunas e cards de tarefas detalhados
│   ├── sidebar.tsx           # Barra de navegação lateral (Workspace e perfil do usuário)
│   ├── stat-cards.tsx        # Indicadores numéricos de desempenho com percentuais de tendência
│   └── weekly-hours-chart.tsx# Gráfico SVG interativo de linha/área das horas semanais
├── lib/                      # Utilitários e armazenamento de dados estáticos
│   ├── data.ts               # Tipagens TypeScript (Task, Event, etc.) e dados mockados
│   └── utils.ts              # Função utilitária cn (Tailwind Merge + Clsx)
├── public/                   # Recursos estáticos (Logos, ícones de aba e imagens)
├── components.json           # Configuração de componentes Shadcn (estilo base-nova)
├── package.json              # Script de build, dependências do projeto e metadados
└── tsconfig.json             # Configuração do compilador TypeScript
```

---

## 📊 Estrutura e Modelagem de Dados

Toda a tipagem e dados do Fluxo residem em [lib/data.ts](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/lib/data.ts).

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
    name: string
    color: string // Cor hex para o indicador visual
  }
  ```

### 2. Modelo de Tarefa (`Task`)
Representa cada item no Kanban ([lib/data.ts#L10](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/lib/data.ts#L10)):
```typescript
type Task = {
  id: string
  code: string            // Ex: "FLX-179"
  title: string           // Descrição sucinta da tarefa
  column: ColumnId        // Coluna atual
  priority: Priority      // Prioridade
  labels: Label[]         // Tags atribuídas
  assignee: string        // Iniciais do responsável (ex: "MA")
  assigneeColor: string   // Cor do avatar do responsável
  hoursLogged: number     // Horas já trabalhadas registradas
  estimate: number        // Horas estimadas para conclusão
}
```

### 3. Modelo de Evento (`ActivityEvent`)
Utilizado para alimentar a linha do tempo de atividades recentes ([lib/data.ts#L242](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/lib/data.ts#L242)):
```typescript
type ActivityEvent = {
  id: string
  user: string            // Iniciais do usuário
  userColor: string       // Cor de fundo do avatar
  action: string          // Ação executada (ex: "concluiu", "moveu")
  target: string          // Alvo da ação (ex: "FLX-244 — Links de compra")
  time: string            // Tempo decorrido amigável (ex: "há 12 min")
}
```

---

## 🎨 Componentes e Interface do Usuário

O dashboard é montado modularmente em [app/page.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/app/page.tsx):

### 1. Barra Lateral ([components/sidebar.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/components/sidebar.tsx))
* **Seletor de Workspace**: Botão interativo para alterar o espaço ativo com ícone `Zap`.
* **Caixa de Busca**: Atalho visual (simulação de `⌘K`).
* **Menu de Navegação Principal**:
  * *Dashboard* (Ativo por padrão)
  * *Caixa de entrada* (Exibe um badge de notificação de `8` mensagens pendentes)
  * *Minhas tarefas*
* **Menu de Workspace**: Links rápidos para *Quadro Kanban*, *Projetos*, *Registro de horas* e *Relatórios*.
* **Perfil do Usuário**: Focado na usuária **Marina Alves** (`marina@fluxo.app`) com iniciais `MA` em um avatar circular.

### 2. Cabeçalho ([components/dashboard-header.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/components/dashboard-header.tsx))
* **Saudação Dinâmica**: Mostra "Bom dia, Marina" e a data atual formatada em português brasileiro (`pt-BR`).
* **Cronômetro de Tarefa Ativa**:
  * Funcionalidade de temporizador em tempo real atualizado a cada 1 segundo via React `useEffect`.
  * Rastreia a tarefa ativa **FLX-243** por padrão.
  * Inicializado em 2h 14m. Permite pausar e retomar a contagem clicando no botão circular correspondente.
* **Notificações**: Botão de sino com estado de *hover*.
* **Criação de Demandas**: Botão de ação rápida "Nova tarefa".

### 3. Cartões de Estatísticas ([components/stat-cards.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/components/stat-cards.tsx))
Exibe quatro blocos contendo métricas chave e as respectivas tendências percentuais:
1. **Horas hoje**: `6h 48m` (Meta: 8h | +12% vs. ontem)
2. **Horas no mês**: `138h` (Meta: 160h | +8% vs. mês anterior)
3. **Tarefas concluídas**: `24` (Neste mês | +15% vs. mês anterior)
4. **Tarefas ativas**: `12` (Detalhadas em 4 a fazer e 4 em progresso | -6% vs. semana passada)

### 4. Gráfico Semanal ([components/weekly-hours-chart.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/components/weekly-hours-chart.tsx))
* Um gráfico de linhas e área desenhado puramente em **SVG nativo** para desempenho máximo.
* Desenha um gradiente de preenchimento (`linearGradient` com ID `#areaFill`) sob a linha de horas.
* Apresenta uma linha tracejada horizontal de referência indicando a meta padrão de 8 horas diárias.
* Calcula dinamicamente o total de horas acumulado nos 7 dias da semana (`weeklyHours` de [lib/data.ts#L223](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/lib/data.ts#L223)) e a média diária.
* Realça os valores de horas em verde (`var(--chart-4)`) nos dias em que a meta foi atingida ou superada (Ex: Quarta-feira com `8.1h`).

### 5. Distribuição de Atividades ([components/activity-breakdown.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/components/activity-breakdown.tsx))
* Exibe a divisão percentual e em horas das atividades desenvolvidas durante o mês atual:
  * **Frontend**: 42h (32%)
  * **Design**: 28h (21%)
  * **Backend**: 34h (26%)
  * **Conteúdo**: 19h (14%)
  * **Reuniões**: 15h (11%)
* Utiliza uma barra horizontal empilhada colorida dinamicamente baseada nos pesos das horas de cada item.

### 6. Quadro Kanban ([components/kanban-board.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/components/kanban-board.tsx))
Agrupa e renderiza os cards de tarefas nas quatro colunas de fluxo:
1. **Backlog** (Indicador cinza)
2. **A fazer** (*Todo* - Indicador azul claro/ciano)
3. **Em progresso** (*In Progress* - Indicador amarelo/laranja)
4. **Concluído** (*Done* - Indicador verde)
* Cada coluna exibe a contagem total de itens e a soma total de horas logadas nas tarefas contidas ali.
* Os cards das tarefas (`TaskCard`) incluem o código identficador, título amigável, iniciais com cor exclusiva do responsável, ícones de prioridade customizados (triângulo de alerta para urgente, barras de sinal para os demais) e indicação de horas logadas vs. estimadas (ex: `2.5/4h`).

### 7. Feed de Atividade ([components/activity-feed.tsx](file:///c:/Users/flavio.alves.SOOW/Downloads/dashboard-de-gestao/components/activity-feed.tsx))
* Linha do tempo vertical exibindo as últimas interações da equipe.
* Mapeia as iniciais do banco de dados para nomes completos reais:
  * `MA` $\rightarrow$ **Marina**
  * `JS` $\rightarrow$ **João**
  * `RP` (ou outros) $\rightarrow$ **Rafa**

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

No terminal, você pode rodar os seguintes comandos usando `pnpm`:

* **Iniciar Ambiente de Desenvolvimento:**
  ```bash
  pnpm dev
  ```
* **Compilar para Produção:**
  ```bash
  pnpm build
  ```
* **Iniciar Servidor de Produção (pós-build):**
  ```bash
  pnpm start
  ```
* **Executar Linter de Código:**
  ```bash
  pnpm lint
  ```
