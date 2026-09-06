# Theme color exceptions

`npm run audit:theme` rejects direct palette classes and inline CSS color values in production UI source. The following narrowly scoped exception is intentional:

- `src/components/ui/role-badge.tsx` keeps three fixed gradients (developer, admin, and user). They are compact role identifiers rather than structural surfaces, text, borders, or controls. Their white label is paired with the deliberately saturated gradient and remains legible in both themes.

Chart data series do not use fixed classes or inline literals. They read the `--chart-leads` and `--chart-sales` CSS tokens in `globals.css`, so canvas chrome and data marks update together with the active theme.

Add an allowlist entry only for a real brand asset or data-visualization color, with the reason documented here. Do not allowlist page surfaces, controls, text, borders, or status UI.
