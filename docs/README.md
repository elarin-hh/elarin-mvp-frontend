# Elarin - AI Fitness Trainer MVP

> **Current Phase:** Real-time Squat Detection with ML
>
> This MVP demonstrates complete squat form analysis using MediaPipe pose detection and TensorFlow.js ML models for real-time feedback.

## 🎯 About This MVP

Elarin is an AI-powered personal fitness trainer that provides real-time exercise form feedback using computer vision and machine learning:

- ✅ Complete UI/UX flow
- ✅ PWA support with offline capabilities
- ✅ Internationalization (pt-BR / en-US)
- ✅ State management and routing
- ✅ Testing infrastructure
- ✅ **Camera capture with MediaPipe pose detection**
- ✅ **TensorFlow.js ML model for squat classification**
- ✅ **Real-time form feedback and error detection**
- ✅ **Persistent error history with timestamps**
- ✅ **Modern phase indicator with glass morphism**

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
│   │   │       └── StagePane.svelte
│   │   ├── stores/              # Svelte stores for state management
│   │   │   ├── app.store.ts     # App-wide state (locale, theme)
│   │   │   └── train.store.ts   # Training session state
│   │   ├── services/            # Service layer
│   │   │   ├── supabase.client.ts
│   │   │   └── telemetry.service.ts
│   │   ├── api/                 # API client
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
│   │   ├── +page.svelte         # Redirects to login
│   │   ├── login/               # Login page
│   │   ├── register/            # Registration page
│   │   ├── exercises/           # Exercise selection
│   │   └── train/               # Real-time training with ML
│   └── app.html                 # PWA-enabled HTML template
├── static/
│   ├── js/                      # ML Detection Scripts
│   │   ├── PoseDetector.js      # MediaPipe pose detection base
│   │   ├── ExerciseDetector.js  # Exercise detection logic
│   │   ├── MLDetector.js        # TensorFlow.js ML detector base
│   │   └── SquatDetectorML.js   # Squat-specific ML detector
│   └── models_tfjs/             # TensorFlow.js Models
│       └── squat/
│           ├── model/           # Trained squat model
│           ├── scaler.json      # Feature scaler
│           └── squat_info.json  # Model metadata
└── tests/
    ├── unit/                    # Vitest unit tests
    └── e2e/                     # Playwright E2E tests
```

## 🔄 User Flow

1. **Login/Register** (`/login`, `/register`)
   - Simple authentication flow (MVP mode)

2. **Exercise Selection** (`/exercises`)
   - Choose from 23+ exercises (currently: Squat fully functional)

3. **Training Session** (`/train`)
   - **Real camera capture** with MediaPipe pose detection
   - **ML-powered squat classification** (up/down/middle stages)
   - **Real-time form feedback** with error detection:
     - Foot placement validation
     - Knee alignment checking
     - Depth control (prevents excessive depth)
     - Movement speed monitoring
     - Torso alignment validation
   - **Modern phase indicator** with glass morphism design
   - **Persistent error history** with timestamps
   - **Camera controls** (Start/Stop) with reactive UI
   - **Automatic rep counting** based on ML predictions

4. **Error Tracking**
   - Real-time error visualization on canvas
   - Detailed error history panel
   - Error categorization (feet, knees, depth, speed, alignment)
   - Timestamp tracking for each error

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

### Frontend
- **Framework:** SvelteKit 2.x + Svelte 5 (with $state runes)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + Glass Morphism
- **PWA:** @vite-pwa/sveltekit
- **i18n:** svelte-i18n
- **State:** Svelte stores

### Computer Vision & ML
- **Pose Detection:** MediaPipe Pose
- **ML Framework:** TensorFlow.js
- **Model Type:** Sequential Neural Network (squat classification)
- **Feature Engineering:** StandardScaler normalization
- **Real-time Processing:** Canvas-based rendering with throttling

### Quality & DevOps
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

### ✅ Phase 1: Frontend Skeleton
- [x] Complete UI/UX flow
- [x] PWA setup
- [x] i18n support
- [x] Testing infrastructure

### ✅ Phase 2: Camera & Vision (Completed)
- [x] Camera permission handling
- [x] MediaPipe pose detection
- [x] Canvas-based rendering
- [x] Real-time pose tracking
- [x] Dynamic script loading with feedback

### ✅ Phase 3: Squat Detection with ML (Current)
- [x] TensorFlow.js integration
- [x] ML-based squat stage classification (up/down/middle)
- [x] Automatic rep counting
- [x] Form validation rules:
  - [x] Foot placement (width validation)
  - [x] Knee alignment (tracking ratio)
  - [x] Depth control (hip/knee position)
  - [x] Movement speed monitoring
  - [x] Torso alignment checking
- [x] Real-time feedback system
- [x] Error history with persistence

### 🔜 Phase 4: Additional Exercises
- [ ] Lunge detection
- [ ] Plank detection
- [ ] Leg Press detection
- [ ] Other exercises (20+ planned)

### 🚀 Phase 5: Backend & Data
- [ ] Supabase integration
- [ ] Real user authentication
- [ ] Session history storage
- [ ] Progress tracking charts
- [ ] Analytics dashboard

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
  enableCameraCapture: true,        // ✅ Enabled - Real camera capture
  enableVisionProcessing: true,     // ✅ Enabled - MediaPipe pose detection
  enableExerciseDetection: true,    // ✅ Enabled - Squat ML detection
  enableTelemetry: false            // ❌ Future feature
};
```

## 🎥 ML-Powered Squat Detection

### Detection Pipeline

1. **Pose Extraction** (MediaPipe)
   - 33 body landmarks tracked in real-time
   - Focus on 9 critical points (nose, shoulders, hips, knees, ankles)
   - Visibility threshold: 60%

2. **Feature Engineering**
   - Extract (x, y, z, visibility) for each landmark
   - Normalize with StandardScaler
   - Feed to TensorFlow.js model

3. **ML Classification**
   - Model predicts: `up`, `down`, or `middle` stage
   - Confidence threshold: 70%
   - Real-time stage transitions

4. **Form Validation** (Hybrid ML + Rules)
   - **Foot Position:** Validates width ratio (shoulder-based)
   - **Knee Tracking:** Ensures proper alignment with feet
   - **Depth Control:** Prevents hip from dropping below knees
   - **Speed Check:** Enforces minimum movement duration (500ms)
   - **Torso Alignment:** Detects lateral tilt

5. **Feedback & Counting**
   - Errors logged with timestamps
   - Reps counted only on correct form
   - Persistent history across sessions

### Model Architecture

```
Input: 36 features (9 landmarks × 4 values)
  ↓
Dense Layer (64 units, ReLU)
  ↓
Dropout (0.3)
  ↓
Dense Layer (32 units, ReLU)
  ↓
Output: 3 classes (up, down, middle) - Softmax
```

### Performance Optimizations

- **Throttling:** 30 FPS target with frame skipping
- **Async ML:** Non-blocking predictions
- **Canvas Rendering:** Hardware-accelerated drawing
- **Global Exposure:** Classes available as `window.SquatDetectorML`

## 🤝 Contributing

Key areas for contribution:

1. **Additional Exercises** - Implement detectors for other exercises
2. **ML Model Training** - Improve squat model accuracy
3. **UI/UX improvements** - Enhance visual feedback
4. **Accessibility** - ARIA labels, keyboard navigation
5. **Performance** - Optimize rendering and ML inference
6. **Documentation** - Add exercise-specific guides

## 📝 Technical Notes

### ML Detection Classes

All detector classes are exposed globally for browser access:

```javascript
window.PoseDetector        // Base MediaPipe pose detector
window.ExerciseDetector    // Exercise detection logic
window.MLDetector          // TensorFlow.js ML base
window.SquatDetectorML     // Squat-specific ML detector
```

### Error Detection Logic

Errors are detected in real-time and logged persistently:

- **Deduplication:** Same error within 2s ignored
- **History Limit:** Last 100 errors kept
- **Timestamp Format:** Unix timestamp (milliseconds)
- **Persistence:** Survives camera stop/start

### Canvas Rendering

- **Phase Indicator:** Modern glass morphism design in top-left corner
- **Glow Effect:** Dynamic color based on stage (green/red/gold)
- **Icons:** Directional arrows (↑ up, ↓ down, • middle)
- **No FPS Counter:** Removed for cleaner UI


## 👥 Authors

Elarin Team

---

**Questions?** Check the code for `// TODO:` comments to see what's planned but not yet implemented.
