# Features Directory

This directory contains feature-based modules organized by domain.

## Structure

```
features/
├── training/       # Training session logic and components
│   ├── components/ # Training-specific components
│   ├── services/   # Training services
│   ├── stores/     # Training state management
│   └── types/      # Training-specific types
├── auth/           # Authentication and user management
│   ├── components/ # Auth forms, guards
│   ├── services/   # Auth API calls
│   └── stores/     # Auth state
└── exercises/      # Exercise management
    ├── components/ # Exercise cards, lists
    ├── services/   # Exercise API calls
    └── types/      # Exercise types
```

## Guidelines

1. **Feature isolation**: Each feature should be self-contained
2. **Shared imports**: Use `$lib/shared` for cross-feature components
3. **Barrel exports**: Each feature should have an `index.ts`
4. **No circular dependencies**: Features should not import from each other directly
