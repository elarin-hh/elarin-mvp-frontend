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
- ✅ **100% TypeScript** (sistema de visão completo)

## 🏗️ Estrutura do Projeto

```
elarin-mvp-frontend/
├── src/                      # Código-fonte TypeScript
│   ├── lib/
│   │   ├── components/       # Componentes Svelte reutilizáveis
│   │   ├── stores/           # State management (Svelte Stores)
│   │   ├── vision/           # ✨ Computer Vision System (TypeScript)
│   │   │   ├── types/        # Type definitions
│   │   │   ├── constants/    # MediaPipe landmarks
│   │   │   ├── utils/        # Funções utilitárias (ângulos, distâncias)
│   │   │   ├── validators/   # Validadores heurísticos (Squat, Lunge)
│   │   │   ├── core/         # FeedbackSystem, ExerciseAnalyzer
│   │   │   ├── ml/           # GenericClassifier (ONNX)
│   │   │   ├── config/       # Carregador de configurações
│   │   │   └── index.ts      # Export principal
│   │   ├── api/              # Clientes REST
│   │   └── types/            # Types globais
│   └── routes/               # SvelteKit routes (file-based)
│       ├── (auth)/           # Páginas autenticadas
│       ├── login/            # Login
│       ├── register/         # Registro
│       ├── exercises/        # Lista de exercícios
│       ├── train/            # Treino com pose detection
│       └── framer/           # Análise de vídeo frame-by-frame
├── static/                   # Assets estáticos
│   ├── assets/               # Imagens, CSS
│   ├── icons/                # Ícones e favicons
│   ├── models/               # Modelos ML (ONNX)
│   │   ├── squat/            # Modelo squat + metadata
│   │   └── lunge/            # Modelo lunge + metadata
│   └── exercises.json        # Catálogo de exercícios
├── .husky/                   # Git hooks (pre-commit)
├── package.json              # Dependências e scripts
├── vite.config.ts            # Configuração Vite
├── svelte.config.js          # Configuração SvelteKit
├── tsconfig.json             # Configuração TypeScript
├── tailwind.config.cjs       # Configuração Tailwind CSS
└── README.md                 # Este arquivo
```

## 🚀 Quick Start

### Pré-requisitos

- **Node.js** >= 20
- **pnpm** >= 9

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/your-org/elarin-mvp-frontend.git
cd elarin-mvp-frontend

# 2. Instale as dependências
pnpm install

# 3. Configure variáveis de ambiente (opcional)
# Crie .env com:
# PUBLIC_SUPABASE_URL=...
# PUBLIC_SUPABASE_ANON_KEY=...

# 4. Inicie o servidor de desenvolvimento
pnpm dev

# 5. Abra no navegador
# http://localhost:5173
```

## 📦 Scripts Disponíveis

```bash
pnpm dev          # Inicia servidor de desenvolvimento (http://localhost:5173)
pnpm build        # Build de produção (output em build/)
pnpm preview      # Preview do build de produção
pnpm lint         # Roda ESLint
pnpm format       # Formata código com Prettier
pnpm typecheck    # Verifica tipos TypeScript
pnpm test         # Roda testes com Vitest
pnpm clean        # Limpa node_modules e build artifacts
```

## 🎨 Stack Tecnológica

### Frontend
- **Framework**: SvelteKit 2.8 + Svelte 5
- **Language**: TypeScript 5.6 (strict mode)
- **Styling**: Tailwind CSS 3.4
- **Build**: Vite 6.3
- **State**: Svelte Stores
- **i18n**: svelte-i18n

### Computer Vision & ML
- **Pose Detection**: MediaPipe Pose (33 landmarks)
- **ML Runtime**: ONNX Runtime Web 1.23
- **Model**: Autoencoder (One-Class Learning)
- **Processing**: 100% client-side (privacidade garantida)
- **Validators**: Heurísticas biomecânicas customizadas

### Backend & Infra
- **BaaS**: Supabase (PostgreSQL + Auth + Storage)
- **Hosting**: Static build (Vercel/Netlify/Cloudflare Pages)
- **PWA**: Vite PWA Plugin

### Quality & Testing
- **Linter**: ESLint 8 + TypeScript ESLint
- **Formatter**: Prettier 3
- **Unit Tests**: Vitest 2.1
- **E2E Tests**: Playwright 1.48
- **Type Safety**: TypeScript strict mode
- **Git Hooks**: Husky + lint-staged

## 💻 Sistema de Visão Computacional

### Arquitetura

O sistema de visão é **100% TypeScript** com arquitetura modular:

```typescript
import {
  ExerciseAnalyzer,
  FeedbackSystem,
  SquatValidator,
  LungeValidator,
  GenericExerciseClassifier,
  loadExerciseConfig,
  MEDIAPIPE_LANDMARKS,
  calculateAngle,
  type PoseLandmarks,
  type FeedbackRecord
} from '$lib/vision';

// 1. Carregar configuração do exercício
const config = await loadExerciseConfig('squat');

// 2. Criar analisador
const analyzer = new ExerciseAnalyzer(config);

// 3. Inicializar (carrega modelo ONNX + validator)
await analyzer.initialize();

// 4. Configurar callbacks
analyzer.setCallbacks({
  onFeedback: (feedback: FeedbackRecord) => {
    console.log('Verdict:', feedback.combined.verdict);
    console.log('Confidence:', feedback.combined.confidence);
    console.log('Messages:', feedback.messages);
  },
  onMetricsUpdate: (metrics) => {
    console.log('Reps:', metrics.validReps);
    console.log('Accuracy:', metrics.accuracy);
  }
});

// 5. Analisar frames (chamado a cada detecção de pose)
async function onPoseDetected(landmarks: PoseLandmarks) {
  const feedback = await analyzer.analyzeFrame(landmarks);
  // Processar feedback...
}

// 6. Configurar modo de feedback
analyzer.setFeedbackMode('hybrid'); // 'ml_only' | 'heuristic_only' | 'hybrid'
```

### Modos de Feedback

1. **Hybrid Mode** (Recomendado)
   - Combina ML (autoencoder) + Heurísticas biomecânicas
   - Maior acurácia (~95%)
   - Feedback específico (ex: "joelho passando do pé")

2. **ML Only**
   - Apenas detecção de anomalias com autoencoder
   - Feedback genérico
   - Útil para movimentos novos

3. **Heuristic Only**
   - Apenas regras biomecânicas
   - Feedback muito específico
   - Não requer modelo treinado

### Validators Disponíveis

- **SquatValidator**: Valida agachamento (profundidade, simetria, postura)
- **LungeValidator**: Valida afundo (joelho, tronco, estabilidade)
- **BaseValidator**: Classe base para criar novos validators

## 🎯 Funcionalidades

### ✅ Implementadas

- [x] Autenticação (Supabase Auth)
- [x] Detecção de pose em tempo real (MediaPipe)
- [x] Análise híbrida ML + Heurísticas
- [x] Exercícios: Squat, Lunge
- [x] Feedback visual (esqueleto colorido)
- [x] Contador de repetições automático
- [x] Modo híbrido/ML/Heurístico selecionável
- [x] PWA instalável
- [x] Sistema 100% TypeScript

### 🚧 Em Desenvolvimento

- [ ] Push-up e Plank validators
- [ ] Histórico de treinos
- [ ] Estatísticas e progressão
- [ ] Planos de treino personalizados
- [ ] Modo multi-usuário
- [ ] Export de treinos (PDF/JSON)

## 📊 Métricas de Performance

- **FPS**: 25-30 (detecção de pose)
- **Latência ML**: 15-30ms (inferência ONNX)
- **Latência Heurística**: <5ms
- **Latência Total**: ~35ms (end-to-end)
- **Acurácia**: ~95% (modo híbrido)
- **Bundle Size**: ~2.5MB (gzipped: ~800KB)

## 🔒 Privacidade e Segurança

- ✅ Processamento 100% client-side (navegador)
- ✅ Vídeo **NUNCA** enviado ao servidor
- ✅ Apenas landmarks (coordenadas x,y,z) processados
- ✅ Autenticação segura (Supabase)
- ✅ HTTPS obrigatório em produção
- ✅ Dados pessoais criptografados

## 📱 Compatibilidade

### Navegadores Suportados

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile (Chrome/Safari iOS 14+)

### Requisitos Mínimos

- Webcam/câmera frontal
- Conexão de internet (para carregar modelos ONNX)
- 4GB RAM
- Processador dual-core
- Resolução mínima: 720p

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
- **Code Style**: Prettier + ESLint (auto-formatação no save)
- **Branches**: `feature/nome`, `fix/nome`, `refactor/nome`
- **TypeScript**: Strict mode habilitado (sem `any`)
- **Components**: PascalCase para arquivos `.svelte`
- **Utilities**: camelCase para `.ts`

### Criar Novo Validator

```typescript
import { BaseValidator } from '$lib/vision/validators/BaseValidator';
import type { PoseLandmarks, ValidationResult } from '$lib/vision/types';
import { MEDIAPIPE_LANDMARKS } from '$lib/vision/constants/mediapipe.constants';
import { calculateAngle } from '$lib/vision/utils/angles.utils';

export class PushupValidator extends BaseValidator {
  validate(landmarks: PoseLandmarks, frameCount: number): ValidationResult {
    this.currentIssues = [];

    // Sua lógica aqui
    const leftElbow = landmarks[MEDIAPIPE_LANDMARKS.LEFT_ELBOW];
    const leftShoulder = landmarks[MEDIAPIPE_LANDMARKS.LEFT_SHOULDER];
    const leftWrist = landmarks[MEDIAPIPE_LANDMARKS.LEFT_WRIST];

    if (this.isVisible(leftElbow) && this.isVisible(leftShoulder) && this.isVisible(leftWrist)) {
      const elbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);

      if (elbowAngle < 90) {
        this.currentIssues.push({
          message: 'Cotovelo muito flexionado',
          severity: 'high'
        });
      }
    }

    return {
      isValid: this.currentIssues.length === 0,
      issues: this.currentIssues
    };
  }
}
```

## 🐛 Troubleshooting

### Erro: "Model not found"
- Verifique se os arquivos `.onnx` estão em `static/models/`
- Rode `pnpm build` para copiar assets

### Erro: "Camera permission denied"
- Habilite permissão de câmera nas configurações do navegador
- Use HTTPS (http://localhost é permitido)

### Pose não detectada
- Garanta boa iluminação
- Fique de corpo inteiro na câmera
- Fundo limpo ajuda na detecção

### Build falhou
- Limpe cache: `pnpm clean && pnpm install`
- Verifique tipos: `pnpm typecheck`
- Verifique Node.js versão >= 20

## 📄 Licença

MIT License - veja [LICENSE](./LICENSE) para detalhes.

## 👥 Equipe

- **Eduardo** - Lead Developer & Computer Vision Engineer

## 🔗 Links Úteis

- [MediaPipe Pose](https://google.github.io/mediapipe/solutions/pose)
- [ONNX Runtime](https://onnxruntime.ai/)
- [SvelteKit Docs](https://kit.svelte.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Versão**: 0.1.0
**Status**: MVP em produção
**Última Atualização**: 19/10/2025

---

<div align="center">
  Feito com ❤️ para melhorar a saúde e bem-estar através da tecnologia
</div>
