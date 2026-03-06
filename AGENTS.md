`pnpm lint`

This runs `eslint .; tsc --noEmit`. Both must pass.
Check this at the end of your work.
Run before committing.

**Files**

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

All plots and visualizations must include: Titles, Axis Labels, Legends, Color Bars, Tooltips
Consistent units: inches (in), radians (rad), seconds (s).

State is controlled with `useViewStore` by Zustand
SAVING_STATE.md describes the state format and usage
Check existing code and look at similar files for patterns before writing new code
Keep todos updated and update TODO.md with new tasks discovered
Data formats are documented in DATA_DOCUMENTATION.md. Read this to understand how data is structured. Check off in the TODO.md file when you have completed a task.

This project is under heavy development and doesn't need backwards compatibility.
