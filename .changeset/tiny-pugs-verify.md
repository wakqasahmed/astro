---
'astro': patch
'@astrojs/check': patch
---

- `astro`: Verify the installed TypeScript is v7+ before treating an export-map failure as supported.
- `@astrojs/check`: Verify the installed TypeScript is v7+ before treating an export-map failure as unsupported.
