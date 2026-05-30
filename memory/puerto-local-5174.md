---
name: puerto-local-5174
description: HackathonLawgic corre en localhost:5174, no 5173 (corrige a CLAUDE.md)
metadata:
  type: feedback
---

Para correr HackathonLawgic en local se usa el puerto **5174**, NO el 5173.

**Why:** Brenda corrigió esto el 2026-05-30. El puerto 5173 lo ocupa su OTRO proyecto (HolaMundo), que suele estar corriendo al mismo tiempo. Esto contradice lo que dice CLAUDE.md ("siempre puerto 5173") — la realidad en su máquina es al revés.

**How to apply:** Arrancar con `npx vite --port 5174 --strictPort` (o `npm run dev` si ya está configurado a 5174). No matar el proceso del 5173 — es de otro proyecto. Si Brenda dice "no carga local", lo más probable es que esté entrando al puerto equivocado: dirigirla a http://localhost:5174.
