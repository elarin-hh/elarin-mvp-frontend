# Elarin - AI Fitness Trainer MVP

> **Current Phase:** Frontend Skeleton Only
>
> This MVP demonstrates the UI/UX flow and architecture without camera capture, MediaPipe, or real-time exercise detection.

## 🎯 About This MVP

Elarin is an AI-powered personal fitness trainer that will eventually provide real-time exercise form feedback using computer vision. This MVP builds the foundation:

- ✅ Complete UI/UX flow
- ✅ PWA support with offline capabilities
- ✅ Internationalization (pt-BR / en-US)
- ✅ State management and routing
- ✅ Testing infrastructure
- ❌ Camera capture (next phase)
- ❌ MediaPipe pose detection (next phase)
- ❌ Real-time exercise feedback (next phase)

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev:web

# Open browser at http://localhost:5173
```

### Build for Production

```bash
pnpm build:web
```

## 📁 Project Structure

```
elarin/apps/web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── common/          # Reusable UI components
│   │   │   │   ├── Button.svelte
│   │   │   │   ├── Card.svelte
│   │   │   │   ├── Header.svelte
│   │   │   │   └── Modal.svelte
│   │   │   └── train/           # Training-specific components
│   │   │       ├── ExerciseSelect.svelte
│   │   │       ├── HUD.svelte
│   │   │       ├── PermissionIntro.svelte
│   │   │       └── StagePane.svelte (placeholder)
│   │   ├── stores/              # Svelte stores for state management
│   │   │   ├── app.store.ts     # App-wide state (locale, theme)
│   │   │   └── train.store.ts   # Training session state
│   │   ├── services/            # Service layer (stubs)
│   │   │   ├── supabase.client.ts
│   │   │   └── telemetry.service.ts
│   │   ├── api/                 # API client (stub)
│   │   │   ├── dtos.ts          # Zod schemas
│   │   │   └── rest.client.ts
│   │   ├── config/
│   │   │   ├── feature-flags.ts
│   │   │   └── i18n.ts          # i18n configuration
│   │   └── i18n/                # Translation files
│   │       ├── en-US/
│   │       └── pt-BR/
│   ├── routes/
│   │   ├── +layout.svelte       # Root layout
│   │   ├── +page.svelte         # Dashboard
│   │   ├── login/
│   │   ├── register/
│   │   └── train/
│   │       ├── select/          # Exercise selection
│   │       ├── intro/           # Onboarding/permission intro
│   │       └── [exercise]/      # Training page + summary
│   └── app.html                 # PWA-enabled HTML template
└── tests/
    ├── unit/                    # Vitest unit tests
    └── e2e/                     # Playwright E2E tests
```

## 🔄 User Flow

1. **Login/Register** (`/login`, `/register`)
   - Mock authentication (stubs only)

2. **Dashboard** (`/`)
   - View stats (mock data)
   - Start training button

3. **Exercise Selection** (`/train/select`)
   - Choose: Squat, Lunge, or Plank

4. **Intro/Permissions** (`/train/intro`)
   - Explains privacy and future features
   - No actual camera permission requested

5. **Training Session** (`/train/[exercise]`)
   - Placeholder video area (no camera)
   - Mock HUD showing reps/sets/duration
   - Manual "Simulate Rep" button for testing

6. **Summary** (`/train/[exercise]/summary`)
   - Shows session results
   - Return to dashboard

## 🧪 Testing

```bash
# Run unit tests
pnpm --filter @elarin/web test:unit

# Run E2E tests
pnpm --filter @elarin/web test:e2e

# Run linter
pnpm lint

# Type check
pnpm typecheck
```

## 🌐 Internationalization

Supported languages:
- 🇺🇸 English (en-US)
- 🇧🇷 Portuguese (pt-BR)

Toggle language using the switcher in the header.

Translation files: `src/lib/i18n/{locale}/{namespace}.json`

## 🔧 Technology Stack

- **Framework:** SvelteKit 2.x + Svelte 5
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **PWA:** @vite-pwa/sveltekit
- **i18n:** svelte-i18n
- **State:** Svelte stores
- **Validation:** Zod
- **Testing:** Vitest + Playwright
- **Linting:** ESLint + Prettier
- **CI/CD:** GitHub Actions

## 📋 Available Scripts

```bash
# Development
pnpm dev:web              # Start dev server

# Building
pnpm build:web            # Production build

# Quality
pnpm lint                 # Run ESLint
pnpm format               # Run Prettier
pnpm typecheck            # TypeScript check
pnpm test                 # Run all tests

# Testing
pnpm --filter @elarin/web test:unit   # Unit tests
pnpm --filter @elarin/web test:e2e    # E2E tests
```

## 🗺️ Roadmap

### ✅ Phase 1: Frontend Skeleton (Current)
- Complete UI/UX flow
- PWA setup
- i18n support
- Testing infrastructure

### 🔜 Phase 2: Camera & Vision (Next)
- [ ] Camera permission handling
- [ ] Device selection (front/back camera)
- [ ] MediaPipe pose detection
- [ ] OffscreenCanvas rendering
- [ ] Web Worker for vision processing

### 🔮 Phase 3: Exercise Logic
- [ ] Exercise-specific rules (squat, lunge, plank)
- [ ] Automatic rep counting
- [ ] Form feedback
- [ ] Real-time guidance

### 🚀 Phase 4: Backend & Data
- [ ] Supabase integration
- [ ] User authentication
- [ ] Session history
- [ ] Progress tracking
- [ ] Analytics

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
VITE_SUPABASE_URL=         # (not used yet)
VITE_SUPABASE_ANON_KEY=    # (not used yet)
VITE_API_BASE_URL=         # (not used yet)
```

### Feature Flags

Located in `src/lib/config/feature-flags.ts`:

```typescript
export const featureFlags = {
  enableCameraCapture: false,       // Will enable in Phase 2
  enableVisionProcessing: false,    // Will enable in Phase 2
  enableExerciseDetection: false,   // Will enable in Phase 3
  enableTelemetry: false
};
```

## 🤝 Contributing

This is an MVP. Key areas for contribution:

1. **UI/UX improvements** - Enhance existing components
2. **Accessibility** - ARIA labels, keyboard navigation
3. **Performance** - Code splitting, lazy loading
4. **Documentation** - Improve this README

## 📝 Notes

- All backend calls are **stubbed** (console.debug only)
- Camera/MediaPipe code is **intentionally absent**
- `// TODO:` comments mark extension points
- Tests verify navigation, not functionality

## 📄 License

[Add your license here]

## 👥 Authors

Elarin Team

---

**Questions?** Check the code for `// TODO:` comments to see what's planned but not yet implemented.
