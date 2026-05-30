# Proyecto del Mini-Hackathon de Brenda (Lawgic)

## Sobre la dueña del proyecto

Este proyecto es de **Brenda**. Brenda apenas está aprendiendo a programar. Es nueva en React, Vercel, MCPs, Supabase, Git/GitHub y en general en herramientas de desarrollo web. Lo creó el 2026-05-29 para participar en el **Mini-Hackathon de Lawgic** del sábado 30 de mayo de 2026 (10:00 AM – 2:00 PM, 4 horas hands-on para construir Artifacts, Skills y mini apps legales con Claude).

## Cómo hablarle a Brenda

- **Explica de manera no técnica la mayor parte del tiempo.** Usa analogías cotidianas, evita jerga, y cuando uses un término técnico explícalo en una frase.
- Puedes ser **un poco técnico** cuando es estrictamente necesario (nombres de comandos, archivos), pero acompáñalo de una explicación amigable.
- **No asumas conocimiento previo** de conceptos como "framework", "deploy", "commit", "branch", "build", "env var", "API", "client/server", "JSX", "hooks". Defínelos brevemente la primera vez que aparezcan.
- Cuando ofrezcas opciones, di pros y contras en lenguaje simple — no la abrumes con detalles.
- Antes de hacer algo que cambie cosas en internet (push, deploy, borrar archivos, instalar paquetes globales), **explica en una frase qué va a pasar** y luego hazlo.
- Si algo falla, **explica en simple por qué falló** antes de proponer el fix.
- Como es hackathon de 4 horas, **prioriza velocidad y soluciones funcionales** sobre código perfecto. Después se refactoriza.

## Comandos especiales de Brenda

| Cuando Brenda dice… | Significa… |
|---|---|
| "súbelo a github" / "súbelo a git" / "haz un push" / "publícalo" | `git add . && git -c user.name="Brenda Barragan" -c user.email="brenbarragan4@gmail.com" commit -m "<mensaje descriptivo en español>" && git push` (NO uses el GitHub MCP para esto — git directo es más rápido). Después de ~30-60s Vercel redespliega solo gracias al auto-deploy. |
| "haz deploy manual" / "fuerza un deploy" | `vercel --prod --yes` desde la raíz (solo si Brenda lo pide explícito; normalmente NO es necesario). |
| "corre el proyecto" / "ábrelo local" | `npm run dev` en la raíz. Siempre puerto **5173** (matar procesos previos si hace falta). |

> **Auto-deploy activo**: el repo `brenbarragan4/HackathonLawgic` está conectado al proyecto Vercel `hackathonlawgic`. Cada push a `main` dispara un deploy automático a producción.

## Ubicación del proyecto (¡IMPORTANTE!)

**La ÚNICA ubicación válida del proyecto en la computadora de Brenda es:**

```
C:\Users\brenb\OneDrive\Desktop\HackathonLawgic
```

- **NUNCA** clones el repo en otra carpeta. Si el cwd no es esa ruta, avísale a Brenda antes de hacer cualquier cambio.
- Si por error existe otra carpeta llamada HackathonLawgic fuera de Desktop, **avísale a Brenda y pídele confirmación** antes de borrarla.
- **Este proyecto es independiente de HolaMundo** (su otro proyecto en Desktop). No mezclar archivos ni dependencias entre ellos.

## Identidad de Git para commits (¡IMPORTANTE!)

Cuando hagas commits a GitHub en nombre de Brenda, **siempre** usa:

- **Nombre:** `Brenda Barragan`
- **Email:** `brenbarragan4@gmail.com` (su correo de GitHub, NO `rncb0963@gmail.com`)

Si `git commit` falla con "Author identity unknown", usa los flags `-c` puntuales sin tocar la config global:

```
git -c user.name="Brenda Barragan" -c user.email="brenbarragan4@gmail.com" commit -m "..."
```

## Stack técnico

- **Frontend:** React 19 + Vite 8 (JavaScript, NO TypeScript)
- **Base de datos / backend:** Supabase (cliente en [src/supabaseClient.js](src/supabaseClient.js))
- **Hosting:** Vercel (proyecto `hackathonlawgic`)
- **Repo:** https://github.com/brenbarragan4/HackathonLawgic (branch `main`)

### URLs

- **Repo GitHub:** https://github.com/brenbarragan4/HackathonLawgic
- **Producción Vercel:** https://hackathonlawgic-fqa9d2m7a-brenbarragan4-7813s-projects.vercel.app
  (también acceso vía el dashboard de Vercel — el alias canónico se asigna automáticamente)

## Cómo correr el proyecto LOCAL

```
npm install      # (solo la primera vez o tras agregar deps)
npm run dev      # arranca en http://localhost:5173
```

- Si el puerto 5173 está ocupado, **matar** el proceso anterior — nunca usar 5174.
- Vite recarga solito al guardar archivos (hot reload).

## Cómo se despliega a Vercel

1. Brenda dice "súbelo a github" → tú haces `git add . && git commit && git push`.
2. GitHub recibe el push.
3. Vercel detecta el push y arranca un build automático (~30-60s).
4. Cuando termina, la URL de producción se actualiza sola.

**Para verificar el deploy** tras un push: `vercel ls hackathonlawgic --yes` — buscar el más reciente con `● Ready`. Si dice `Error`, leer logs con `vercel inspect <url> --logs`.

## Variables de entorno

Vive en dos lugares — deben estar **sincronizadas**:

### 1. Local — archivo `.env.local` (en la raíz del proyecto)

```
GEMINI_API_KEY=""
VITE_SUPABASE_KEY="sb_publishable_H_3OJzCwCq2zs_Rvfs_-hQ_FcA8BxOs"
VITE_SUPABASE_URL="https://bbbracvhjsqatvngtivc.supabase.co"
```

- `.env.local` está en `.gitignore` — **nunca se sube a GitHub**. ✅
- Si Brenda agrega una variable nueva, también hay que agregarla en Vercel (siguiente sección).

### 2. Producción — Vercel

Para agregar una variable nueva en producción:

```
vercel env add NOMBRE_VARIABLE production
```

Te pide el valor, lo guarda cifrado en Vercel. Después de agregarla, **redeploya** con un push (o `vercel --prod --yes`) para que la nueva variable tome efecto.

Para ver qué variables ya están en Vercel: `vercel env ls`.

### ⚠️ Aviso sobre Supabase

La base de datos `bbbracvhjsqatvngtivc.supabase.co` actualmente es **la misma que usa el proyecto HolaMundo/Lawgic en producción**. Si Brenda hace queries que modifican datos (`insert`, `update`, `delete`) durante el hackathon, tocaría la base real de Lawgic.

**Recomendación**: si el Artifact del hackathon necesita escribir datos, crear un proyecto Supabase **nuevo y separado** antes de empezar. Actualizar entonces `VITE_SUPABASE_URL` y `VITE_SUPABASE_KEY` en `.env.local` y en Vercel.

## MCPs configurados (en `~/.claude.json`, compartidos con HolaMundo)

- `github` — para crear repos, issues, PRs vía API. **No usar para push** (usar `git` directo).
- `vercel` — gestionar despliegues, env vars, dominios.
- `supabase` — full access, todos los proyectos. Permite crear tablas, queries SQL, migraciones.

## Convenciones del proyecto

- **Idioma:** Español en UI, comentarios y mensajes de commit.
- **Mensajes de commit:** descriptivos, en español, en presente: "Agregar contador" no "Agregué contador".
- **Estilo visual inicial:** tema oscuro azulado con acentos naranja (`#ff914d`, `#ffb37a`) — definido en [src/App.css](src/App.css). Brenda puede cambiarlo en cualquier momento.
- **Secretos:** nunca commitear `.env.local` ni `.env`. Variables nuevas siempre se agregan también en Vercel.
- **No editar con PowerShell `Get-Content`/`Set-Content`** — corrompe UTF-8 (acentos, emojis). Usar la herramienta Edit.
- **Cambios mínimos** cuando Brenda los pide puntuales: si pide solo color, tocar SOLO color.
