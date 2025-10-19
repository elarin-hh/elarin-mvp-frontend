# Elarin Web App

Aplicação web principal do Elarin MVP - Plataforma de Treino Pessoal com IA.

## 🏗️ Arquitetura do Projeto

```
apps/web/
├── docs/                      # 📚 Documentação completa
│   ├── architecture/          # Arquitetura e integrações
│   ├── api/                   # Documentação de endpoints
│   ├── guides/                # Guias e tutoriais
│   └── deployment/            # Deploy e DevOps
│
├── src/
│   ├── lib/
│   │   ├── components/        # Componentes Svelte reutilizáveis
│   │   ├── stores/            # State management (Svelte stores)
│   │   ├── services/          # 🆕 Lógica de negócio
│   │   │   └── vision/        # Computer Vision System
│   │   │       ├── core/      # FeedbackSystem
│   │   │       ├── analyzers/ # ExerciseAnalyzer
│   │   │       ├── classifiers/  # ML Classifiers (ONNX)
│   │   │       ├── validators/   # Heuristic Validators
│   │   │       ├── config/    # Configurações de exercícios
│   │   │       └── constants/ # Constantes (MediaPipe landmarks)
│   │   ├── utils/             # Funções utilitárias
│   │   ├── types/             # TypeScript type definitions
│   │   └── config/            # Configurações da aplicação
│   │
│   ├── routes/                # SvelteKit file-based routing
│   │   ├── +layout.svelte
│   │   ├── +page.svelte       # Home
│   │   ├── train/             # Página de treino
│   │   ├── profile/           # Perfil do usuário
│   │   └── exercises/         # Biblioteca de exercícios
│   │
│   └── app.html               # HTML template
│
├── static/                    # Assets estáticos
│   ├── assets/                # Imagens, CSS globais
│   ├── icons/                 # Icons, favicons
│   ├── models/                # 🆕 ML models (ONNX)
│   │   ├── squat/
│   │   │   ├── squat_autoencoder.onnx
│   │   │   ├── squat_metadata.json
│   │   │   └── config.json
│   │   └── lunge/
│   │       └── config.json
│   └── exercises.json         # Catálogo de exercícios
│
├── tests/                     # Testes
│   ├── unit/                  # Testes unitários (Vitest)
│   └── e2e/                   # Testes E2E (Playwright)
│
├── .eslintrc.cjs              # ESLint config
├── package.json               # Dependencies e scripts
├── tsconfig.json              # TypeScript config
├── vite.config.ts             # Vite bundler config
├── svelte.config.js           # SvelteKit config
├── tailwind.config.js         # Tailwind CSS config
└── README.md                  # Este arquivo

```

## 🚀 Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev              # Inicia servidor de desenvolvimento (localhost:5173)

# Build
pnpm build            # Build de produção
pnpm preview          # Preview do build de produção

# Qualidade de Código
pnpm lint             # Roda ESLint
pnpm format           # Formata código com Prettier
pnpm typecheck        # Verifica tipos TypeScript

# Testes
pnpm test             # Roda todos os testes
pnpm test:unit        # Apenas testes unitários
pnpm test:e2e         # Apenas testes E2E
```

## 🎯 Funcionalidades Principais

### 1. **Sistema de Visão Computacional** (Computer Vision)
- **Localização**: `src/lib/services/vision/`
- **Tecnologias**: MediaPipe Pose + ONNX Runtime Web
- **Modo Híbrido**: ML (Autoencoder) + Validação Heurística

### 2. **Análise de Exercícios em Tempo Real**
- Detecção de pose (33 pontos MediaPipe)
- Classificação ML (One-Class Learning)
- Validação biomecânica
- Feedback visual e textual instantâneo

### 3. **Exercícios Suportados**
- ✅ Squat (Agachamento)
- ✅ Lunge (Afundo)
- 🚧 Push-up (em desenvolvimento)
- 🚧 Plank (em desenvolvimento)

## 📦 Dependências Principais

### Runtime
- **SvelteKit** `^2.8.0` - Framework web
- **Svelte** `^5.1.0` - UI framework (runes mode)
- **Supabase** `^2.39.0` - Backend/Auth/DB
- **Vite** `^6.3.0` - Build tool
- **svelte-i18n** `^4.0.0` - Internacionalização
- **Zod** `^3.22.4` - Validação de schemas

### Dev
- **TypeScript** `^5.6.3`
- **Tailwind CSS** `^3.4.13`
- **ESLint** `^8.56.0`
- **Prettier** `^3.2.4`
- **Vitest** `^2.1.3` - Testes unitários
- **Playwright** `^1.48.0` - Testes E2E
- **Vite PWA** `^1.0.0` - Progressive Web App

## 🔧 Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz de `apps/web/`:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Primeira Execução

```bash
# 1. Instalar dependências
pnpm install

# 2. Rodar em desenvolvimento
pnpm dev

# 3. Abrir navegador
# http://localhost:5173
```

## 📖 Documentação Completa

Consulte a pasta `docs/` para documentação detalhada:

- **[Architecture](./docs/architecture/ARCHITECTURE.md)** - Arquitetura técnica completa
- **[Integration Summary](./docs/architecture/INTEGRATION_SUMMARY.md)** - Resumo da integração
- **[Feedback Modes](./docs/architecture/FEEDBACK_MODES.md)** - Modos de análise (ML/Heurístico/Híbrido)
- **[Quick Start](./docs/guides/QUICK_START.md)** - Guia rápido
- **[Testing Guide](./docs/guides/TESTING_GUIDE.md)** - Como testar
- **[API Endpoints](./docs/api/ENDPOINTS_CORRETOS.md)** - Documentação da API
- **[Deploy](./docs/deployment/DEPLOY.md)** - Como fazer deploy

## 🎨 Stack Tecnológica

- **Frontend**: Svelte 5 + SvelteKit
- **Styling**: Tailwind CSS
- **State**: Svelte Stores
- **Build**: Vite 6
- **Language**: TypeScript
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Computer Vision**: MediaPipe Pose
- **Machine Learning**: ONNX Runtime Web
- **PWA**: Vite PWA Plugin

## 🧪 Testes

```bash
# Unitários (Vitest)
pnpm test:unit

# E2E (Playwright)
pnpm test:e2e

# Com coverage
pnpm test --coverage
```

## 📱 PWA Support

O projeto é configurado como Progressive Web App:
- Instalável no desktop/mobile
- Funciona offline (modo limitado)
- Ícones e manifest configurados

## 🤝 Contribuindo

1. Siga as convenções de código (ESLint + Prettier)
2. Escreva testes para novas features
3. Atualize a documentação
4. Crie commits semânticos

## 📄 Licença

MIT

---

**Versão**: 0.1.0
**Última Atualização**: 18/10/2025
