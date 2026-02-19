# AGENTS.md - Agentic Coding Guidelines

This file contains guidelines for AI agents operating in this repository.

---

## 1. Build, Lint, and Test Commands

### Development
```bash
pnpm dev          # Start development server on port 5174
pnpm build        # TypeScript build + Vite production build
pnpm preview      # Preview production build
```

### Linting and Type Checking
```bash
pnpm lint         # Run ESLint + TypeScript type check (REQUIRED before committing)
```

This runs `eslint .; tsc --noEmit`. Both must pass.

### Individual Commands
```bash
eslint .          # ESLint only
tsc --noEmit      # TypeScript type check only
```

---

## 2. Code Style Guidelines

### General Principles
- **Keep responses concise** - Answer directly with minimal preamble
- **No unnecessary comments** - Only add comments when genuinely useful for understanding complex logic
- **Use tool before edit** - Always Read a file before editing it
- **Run lint before commit** - Always run `pnpm lint` and fix errors

### TypeScript

**Strict Mode Enabled**
- All TypeScript strict checks are on (`strict: true` in tsconfig)
- No `any` types - use `unknown` if type is truly unknown
- Use explicit types for function parameters and return values

**Type Definition Patterns**
```typescript
// Interface for context types
interface ThresholdContextType {
  thresholds: ThresholdState;
  setThreshold: (type: ThresholdType, value: number) => void;
}

// Export types and interfaces
export type ThresholdType = "displacement" | "velocity";

// Use interfaces for objects, type for unions
interface Foo { ... }
type Bar = "a" | "b";
```

### React Patterns

**Context Providers**
- Create context with `createContext<T | undefined>(undefined)`
- Export both Provider component and custom hook
- Hook throws error if used outside Provider
- Use `useMemo` for context value to prevent unnecessary re-renders

```typescript
const MyContext = createContext<MyContextType | undefined>(undefined);

export function MyProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => ({ ... }), [deps]);
  return <MyContext.Provider value={value}>{children}</MyContext.Provider>;
}

export function useMyContext() {
  const ctx = useContext(MyContext);
  if (!ctx) throw new Error("useMyContext must be used within MyProvider");
  return ctx;
}
```

**Component Patterns**
- Use functional components with explicit prop types
- Export named components: `export function MyComponent()`
- Internal/helper components can be non-exported
- Use `React.FC` only when necessary (usually not needed)

**Hooks**
- Name custom hooks with `use` prefix: `useAnimationData`, `useThresholds`
- Memoize expensive computations with `useMemo`
- Memoize callbacks with `useCallback` when passed as props
- Include dependencies arrays (ESLint will warn if wrong)

### Import Conventions

**Order (grouped, each group separated by blank line):**
1. React imports: `import React, { useState } from "react";`
2. External libraries: `import { Box, Button } from "lucide-react";`
3. Absolute imports (@/*): `import { useAnimationData } from "@/hooks/nodeDataHook";`
4. Relative imports: `import { BuildingScene } from "./BuildingScene";`
5. Type imports: `import type { DockviewPanelProps } from "dockview";`

**Path Aliases**
- Use `@/` for src root: `import { Foo } from "@/components/Foo";`
- Avoid relative paths beyond one level (`../`) when possible

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Components | PascalCase | `View3d`, `DamageThresholdPanel` |
| Hooks | camelCase with `use` prefix | `usePlayback`, `useThresholds` |
| Contexts | PascalCase | `ThresholdProvider`, `useThresholds` |
| Files | kebab-case | `page.tsx`, `damage-threshold-panel.tsx` |
| Types/Interfaces | PascalCase | `ThresholdState`, `ViewMode` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_THRESHOLDS`, `THRESHOLD_UNITS` |
| CSS Classes | kebab-case | `className="flex flex-col"` |

### Error Handling

**Context Usage Errors**
```typescript
export function useThresholds() {
  const ctx = useContext(ThresholdContext);
  if (!ctx) {
    throw new Error("useThresholds must be used within ThresholdProvider");
  }
  return ctx;
}
```

**Error Boundaries**
- Let errors propagate to React error boundary
- Use meaningful error messages
- Avoid silently catching errors

### Unused Variables

ESLint rule: Unused variables are errors. Prefix with `_` if intentionally unused:
```typescript
const [_a, b] = getValues();  // _a is intentionally unused
function handleEvent(_event: Event) { }  // unused param
```

---

## 3. Project Architecture

### File Organization
```
src/
├── components/       # Reusable UI components
├── contexts/         # React context providers
├── hooks/           # Custom React hooks
├── lib/             # Utilities, parsers, types
├── pages/           # Route page components
│   └── View3d/      # Page-specific components
└── App.tsx          # Root component
```

### Context Providers
- All shared state uses React context
- Providers wrap app at root or page level
- All views sync to same context (time, selection, thresholds)

### Panel System
- Uses `dockview` for flexible panel layouts
- Panels defined in `MagicPanel.tsx` catalog
- Add new panels to catalog and default layout

### Data Flow
1. Animation data loaded via `useAnimationData` hook
2. Precomputed stats calculated during load
3. Context providers distribute to all components
4. 3D view, charts, panels all react to context changes

---

## 4. UI/Styling

### Tailwind CSS
- Use utility classes from Tailwind CSS v4
- Prefer flexbox layouts: `flex flex-col gap-4`
- Use semantic class names: `bg-neutral-100`, `text-sm`

### Shadcn UI Components
- Use prebuilt components from `@/components/ui/`
- Examples: Button, Switch, Slider, Popover, etc.

### Lucide Icons
- Import from `lucide-react`
- Use inline: `<Button><BoxSelect size={14} /></Button>`

---

## 5. Three.js / React-Three-Fiber

### Performance
- Use `useFrame` for animation loops
- Memoize geometries and materials
- Use instanced meshes for many objects
- Avoid recreating objects in render

### Scene Components
- Export functional components for scene content
- Use `@react-three/drei` helpers
- Handle lighting and camera separately

---

## 6. Scientific Visualization Standards

All plots and visualizations must include:
- **Titles**: Descriptive chart titles
- **Axis Labels**: With units (e.g., "Displacement (in)")
- **Legends**: For multi-series plots
- **Color Bars**: For continuous color scales
- **Tooltips**: Explaining values on hover

Consistent units: inches (in), radians (rad), seconds (s).

---

## 7. Important Notes

- **Always run `pnpm lint` before finishing** - This is mandatory
- **Check existing code** - Look at similar files for patterns before writing new code
- **Read before edit** - Always read a file before editing it
- **Keep todos updated** - Update TODO.md with new tasks discovered
- **Document decisions** - Add to README.md or TODO.md as needed
