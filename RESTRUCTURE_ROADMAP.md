# 🗺️ ROADMAP - Reestruturação Completa do Projeto

## 🎯 Problema Identificado

O projeto está configurado como um **MONOREPO** (com `apps/web/`) mas você tem apenas **UMA aplicação**.

### Estrutura Atual (CONFUSA) ❌
```
elarin-mvp-frontend/               # Raiz do "monorepo"
├── package.json                   # Root package (quase vazio)
├── pnpm-workspace.yaml            # Workspace config
├── apps/
│   └── web/                       # 🤔 Por que "apps/web"?
│       ├── package.json           # ✅ Package REAL da aplicação
│       ├── vite.config.ts         # ✅ Vite config REAL
│       ├── tsconfig.json          # ✅ TypeScript config REAL
│       ├── .eslintrc.cjs          # ✅ ESLint config REAL
│       ├── tailwind.config.cjs    # ✅ Tailwind config REAL
│       ├── svelte.config.js       # ✅ Svelte config REAL
│       └── ... (10+ arquivos de config!)
```

**Problema**: Tudo importante está dentro de `apps/web/`, a raiz está quase vazia!

---

## ✅ Solução: SIMPLIFICAR - Projeto SvelteKit Normal

Como você tem apenas **UMA aplicação web**, não precisa de monorepo!

### Estrutura Proposta (CLARA) ✅
```
elarin-mvp-frontend/               # Raiz do projeto SvelteKit
├── .github/                       # CI/CD workflows
├── docs/                          # 📚 Documentação
│   ├── architecture/
│   ├── api/
│   ├── guides/
│   └── deployment/
├── src/                           # 🎯 Código-fonte
│   ├── lib/
│   │   ├── components/           # Componentes Svelte
│   │   ├── stores/               # State management
│   │   ├── services/             # Lógica de negócio
│   │   │   └── vision/           # Computer Vision
│   │   ├── utils/                # Utilitários
│   │   ├── types/                # TypeScript types
│   │   └── config/               # Configs
│   └── routes/                   # SvelteKit routes
│       ├── +layout.svelte
│       ├── +page.svelte
│       ├── train/
│       └── ...
├── static/                        # Assets estáticos
│   ├── assets/
│   ├── icons/
│   ├── models/                   # ML models
│   └── exercises.json
├── tests/                         # Testes
│   ├── unit/
│   └── e2e/
├── .husky/                        # Git hooks
├── .eslintrc.cjs                 # ✅ Na raiz (onde deve estar)
├── .prettierrc.json              # ✅ Na raiz
├── package.json                  # ✅ O ÚNICO package.json
├── vite.config.ts                # ✅ Na raiz
├── tsconfig.json                 # ✅ Na raiz
├── svelte.config.js              # ✅ Na raiz
├── tailwind.config.cjs           # ✅ Na raiz
├── postcss.config.cjs            # ✅ Na raiz
├── playwright.config.ts          # ✅ Na raiz
├── vitest.config.ts              # ✅ Na raiz
├── .gitignore
└── README.md
```

**Benefício**: Estrutura padrão de projeto SvelteKit - clara, simples, fácil de entender!

---

## 📋 ROADMAP DETALHADO

### **FASE 1: Backup e Preparação** ⚠️
- [ ] Criar backup completo do projeto
- [ ] Commitar estado atual no git (se aplicável)
- [ ] Listar TODOS os arquivos em `apps/web/`

### **FASE 2: Mover Código-Fonte** 📦
- [ ] Mover `apps/web/src/` → `src/`
- [ ] Mover `apps/web/static/` → `static/`
- [ ] Mover `apps/web/tests/` → `tests/` (se existir)
- [ ] Mover `apps/web/docs/` → `docs/`

### **FASE 3: Mover Configurações** ⚙️
- [ ] Mover `apps/web/package.json` → `package.json` (substituir raiz)
- [ ] Mover `apps/web/vite.config.ts` → `vite.config.ts`
- [ ] Mover `apps/web/tsconfig.json` → `tsconfig.json`
- [ ] Mover `apps/web/svelte.config.js` → `svelte.config.js`
- [ ] Mover `apps/web/.eslintrc.cjs` → `.eslintrc.cjs`
- [ ] Mover `apps/web/.prettierrc.json` → `.prettierrc.json`
- [ ] Mover `apps/web/tailwind.config.cjs` → `tailwind.config.cjs`
- [ ] Mover `apps/web/postcss.config.cjs` → `postcss.config.cjs`
- [ ] Mover `apps/web/playwright.config.ts` → `playwright.config.ts`
- [ ] Mover `apps/web/vitest.config.ts` → `vitest.config.ts`
- [ ] Mover `apps/web/.lintstagedrc.json` → `.lintstagedrc.json`

### **FASE 4: Mover Git Hooks** 🪝
- [ ] Mover `apps/web/.husky/` → `.husky/`
- [ ] Atualizar paths nos hooks (remover referências a `apps/web/`)

### **FASE 5: Mover Arquivos Diversos** 📄
- [ ] Mover `apps/web/.gitignore` → `.gitignore` (merge com existente)
- [ ] Mover `apps/web/.env*` → raiz (se existir)
- [ ] Mover `apps/web/README.md` → `README.md` (merge com existente)

### **FASE 6: Limpar Estrutura Antiga** 🗑️
- [ ] Remover pasta `apps/` completamente
- [ ] Remover `pnpm-workspace.yaml` (não é mais monorepo)
- [ ] Remover `node_modules/` da raiz
- [ ] Limpar `.svelte-kit/` antigo

### **FASE 7: Ajustar Configurações** 🔧
- [ ] Atualizar `package.json`:
  - Remover `@elarin/web` scope (não precisa mais)
  - Ajustar scripts se necessário
  - Remover referências a workspaces
- [ ] Atualizar `tsconfig.json`:
  - Verificar paths
  - Ajustar se necessário
- [ ] Atualizar `vite.config.ts`:
  - Verificar paths relativos
- [ ] Atualizar `.husky/` hooks:
  - Remover paths `../../` e `apps/web/`

### **FASE 8: Reinstalar Dependências** 📦
- [ ] Rodar `pnpm install` (instalará tudo na raiz)
- [ ] Verificar `node_modules/` criado corretamente

### **FASE 9: Testar Aplicação** 🧪
- [ ] Rodar `pnpm dev` - verificar se inicia
- [ ] Acessar `localhost:5173` - verificar se carrega
- [ ] Rodar `pnpm build` - verificar se builda
- [ ] Rodar `pnpm lint` - verificar linter
- [ ] Rodar `pnpm typecheck` - verificar tipos
- [ ] Rodar `pnpm test` (se tiver testes)

### **FASE 10: Ajustar Imports** 🔗
- [ ] Verificar se todos imports estão funcionando
- [ ] Ajustar paths absolutos se necessário
- [ ] Verificar imports de `static/`

### **FASE 11: Atualizar Documentação** 📚
- [ ] Atualizar `README.md` com nova estrutura
- [ ] Atualizar docs sobre estrutura de pastas
- [ ] Remover referências a "monorepo"

### **FASE 12: Commit Final** 🎉
- [ ] Commit das mudanças com mensagem clara
- [ ] Atualizar `.gitignore` se necessário
- [ ] Push para repositório (se aplicável)

---

## ⚠️ CUIDADOS IMPORTANTES

### Antes de Começar:
1. ✅ **FAZER BACKUP** completo da pasta
2. ✅ **COMMITAR** estado atual no git
3. ✅ **NÃO DELETAR** nada antes de copiar

### Durante a Migração:
1. ⚠️ **COPIAR primeiro**, deletar depois
2. ⚠️ **TESTAR** a cada fase
3. ⚠️ **VERIFICAR** imports e paths

### Possíveis Problemas:
- 🔴 Imports quebrados (paths relativos)
- 🔴 Config paths incorretos
- 🔴 Git hooks com paths errados
- 🔴 `.env` não copiado

---

## 📊 Comparação: ANTES vs DEPOIS

### ANTES (Monorepo Desnecessário) ❌
```
elarin-mvp-frontend/
├── package.json              (root vazio)
├── pnpm-workspace.yaml       (workspace config)
└── apps/
    └── web/                  (toda aplicação aqui!)
        ├── package.json      (real package)
        ├── vite.config.ts    (real config)
        ├── src/              (real source)
        └── ... (10+ configs)
```
- ❌ Confuso: por que `apps/web`?
- ❌ 2 `package.json` (raiz + apps/web)
- ❌ Configs espalhados
- ❌ Complexidade desnecessária

### DEPOIS (SvelteKit Padrão) ✅
```
elarin-mvp-frontend/
├── package.json              ✅ Único package.json
├── vite.config.ts            ✅ Config na raiz
├── tsconfig.json             ✅ TypeScript na raiz
├── src/                      ✅ Source na raiz
├── static/                   ✅ Assets na raiz
├── docs/                     ✅ Docs na raiz
└── tests/                    ✅ Tests na raiz
```
- ✅ Claro: projeto SvelteKit normal
- ✅ 1 `package.json` único
- ✅ Configs centralizados na raiz
- ✅ Estrutura padrão da comunidade

---

## 🎯 Resultado Final

### Benefícios:
1. ✅ **Simplicidade**: Estrutura padrão SvelteKit
2. ✅ **Clareza**: Sem camadas desnecessárias
3. ✅ **Familiaridade**: Qualquer dev Svelte entende
4. ✅ **Manutenibilidade**: Fácil navegar e encontrar arquivos
5. ✅ **Performance**: Menos overhead de workspace
6. ✅ **Documentação**: Alinhado com docs oficiais SvelteKit

### Quando Usar Monorepo:
- ❌ **NÃO** para 1 aplicação
- ✅ **SIM** para múltiplas apps (web + mobile + admin)
- ✅ **SIM** para shared packages entre apps
- ✅ **SIM** para frontend + backend no mesmo repo

### Seu Caso:
- Você tem: **1 aplicação web** (SvelteKit)
- Não precisa: Monorepo
- Solução: **Projeto SvelteKit padrão** ✅

---

## 🚀 Próximos Passos

1. **Revisar este roadmap** - está claro?
2. **Fazer backup** - copiar pasta inteira
3. **Aprovar execução** - posso começar?

---

**Status**: 📋 ROADMAP COMPLETO - AGUARDANDO APROVAÇÃO
**Estimativa**: 30-40 minutos para execução completa
**Risco**: 🟡 Médio (muitos arquivos, mas processo seguro se feito passo a passo)
