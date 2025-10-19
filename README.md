# Elarin MVP - AI-Powered Personal Training Platform

> Plataforma de treino pessoal com inteligência artificial para análise de movimento em tempo real

## 🎯 Sobre o Projeto

Elarin é uma plataforma MVP que utiliza Computer Vision e Machine Learning para analisar exercícios físicos em tempo real, fornecendo feedback instantâneo sobre a execução correta dos movimentos.

### Características Principais

- ✅ Análise híbrida (ML + Heurísticas biomecânicas)
- ✅ Feedback visual em tempo real
- ✅ Detecção de 33 pontos do corpo (MediaPipe Pose)
- ✅ Processamento 100% no navegador (privacidade)
- ✅ PWA instalável (funciona offline)
- ✅ Multiplataforma (desktop + mobile)

## 🏗️ Estrutura do Monorepo

```
elarin-mvp-frontend/
├── apps/
│   └── web/                  # 🎯 Aplicação web principal (SvelteKit)
├── .github/                  # CI/CD workflows
├── package.json              # Root package config
├── pnpm-workspace.yaml       # PNPM workspace
└── README.md                 # Este arquivo
```

## 🚀 Quick Start

### Pré-requisitos

- Node.js >= 20
- pnpm >= 9

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/your-org/elarin-mvp-frontend.git
cd elarin-mvp-frontend

# 2. Instale as dependências
pnpm install

# 3. Configure variáveis de ambiente
# Crie .env em apps/web/ com:
# PUBLIC_SUPABASE_URL=...
# PUBLIC_SUPABASE_ANON_KEY=...

# 4. Inicie o servidor de desenvolvimento
pnpm dev

# 5. Abra no navegador
# http://localhost:5173
```

## 📦 Scripts Disponíveis

```bash
pnpm dev          # Inicia servidor de desenvolvimento
pnpm build        # Build de produção
pnpm preview      # Preview do build
pnpm lint         # Roda linter
pnpm format       # Formata código
pnpm typecheck    # Verifica tipos TypeScript
pnpm test         # Roda todos os testes
pnpm clean        # Limpa node_modules e build artifacts
```

## 🎨 Stack Tecnológica

### Frontend
- **Framework**: SvelteKit 2.8 + Svelte 5
- **Language**: TypeScript 5.6
- **Styling**: Tailwind CSS 3.4
- **Build**: Vite 6.3
- **State**: Svelte Stores
- **i18n**: svelte-i18n

### Computer Vision & ML
- **Pose Detection**: MediaPipe Pose (33 landmarks)
- **ML Runtime**: ONNX Runtime Web
- **Model**: Autoencoder (One-Class Learning)
- **Processing**: 100% client-side

### Backend & Infra
- **BaaS**: Supabase (PostgreSQL + Auth + Storage)
- **Hosting**: TBD (Vercel/Netlify/Cloudflare Pages)
- **PWA**: Vite PWA Plugin

### Quality & Testing
- **Linter**: ESLint 8 + TypeScript ESLint
- **Formatter**: Prettier 3
- **Unit Tests**: Vitest 2.1
- **E2E Tests**: Playwright 1.48
- **Type Safety**: TypeScript strict mode

## 📚 Documentação

A documentação completa está disponível em `apps/web/docs/`:

- **[Arquitetura](./apps/web/docs/architecture/ARCHITECTURE.md)** - Detalhes técnicos do sistema
- **[Guia Rápido](./apps/web/docs/guides/QUICK_START.md)** - Como começar
- **[API Endpoints](./apps/web/docs/api/ENDPOINTS_CORRETOS.md)** - Documentação da API
- **[Deploy](./apps/web/docs/deployment/DEPLOY.md)** - Como fazer deploy

## 🎯 Funcionalidades

### ✅ Implementadas

- [x] Autenticação (Supabase Auth)
- [x] Detecção de pose em tempo real (MediaPipe)
- [x] Análise híbrida ML + Heurísticas
- [x] Exercícios: Squat, Lunge
- [x] Feedback visual (esqueleto colorido)
- [x] Contador de repetições
- [x] Modo híbrido/ML/Heurístico selecionável
- [x] PWA instalável

### 🚧 Em Desenvolvimento

- [ ] Push-up e Plank
- [ ] Histórico de treinos
- [ ] Estatísticas e progressão
- [ ] Planos de treino personalizados
- [ ] Modo multi-usuário

## 🤝 Contribuindo

### Workflow de Desenvolvimento

1. Crie uma branch a partir de `main`
2. Faça suas alterações seguindo as convenções
3. Rode `pnpm lint` e `pnpm typecheck`
4. Escreva/atualize testes
5. Commit com mensagens semânticas
6. Abra um Pull Request

### Convenções

- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, etc)
- **Code Style**: Prettier + ESLint (configurado)
- **Branches**: `feature/nome`, `fix/nome`, `refactor/nome`
- **TypeScript**: Strict mode habilitado

## 📊 Métricas de Performance

- **FPS**: 25-30 (detecção de pose)
- **Latência ML**: 15-30ms (inferência)
- **Latência Heurística**: <5ms
- **Latência Total**: ~35ms (end-to-end)
- **Acurácia**: ~95% (modo híbrido)

## 🔒 Privacidade e Segurança

- ✅ Processamento 100% client-side
- ✅ Vídeo NUNCA enviado ao servidor
- ✅ Apenas landmarks (coordenadas) enviados ao backend
- ✅ Autenticação segura (Supabase)
- ✅ HTTPS obrigatório em produção

## 📱 Compatibilidade

### Navegadores Suportados

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile (Chrome/Safari)

### Requisitos Mínimos

- Webcam/câmera frontal
- Conexão de internet (para carregar modelos)
- 4GB RAM
- Processador dual-core

## 📄 Licença

MIT License - veja [LICENSE](./LICENSE) para detalhes.

## 👥 Equipe

- **Eduardo** - Lead Developer

## 🔗 Links Úteis

- [Documentação Completa](./apps/web/docs/)
- [Roadmap](./apps/web/docs/ROADMAP.md)
- [Changelog](./CHANGELOG.md)

---

**Versão**: 0.1.0
**Status**: MVP
**Última Atualização**: 18/10/2025

---

<div align="center">
  Feito com ❤️ para melhorar a saúde e bem-estar através da tecnologia
</div>
