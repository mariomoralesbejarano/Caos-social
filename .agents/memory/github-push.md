---
name: GitHub push in workspace
description: Publicar cambios cuando el remoto HTTPS no acepta credenciales del CLI local.
---

El remoto HTTPS puede rechazar el `git push` local aunque el repositorio esté conectado al workspace.

**Why:** La autenticación administrada por Replit no siempre está disponible para el proceso Git del shell.

**How to apply:** Tras crear el commit y verificar el build, usar la conexión GitHub administrada (`gitPush` con la rama y proveedor) en lugar de intentar exponer o gestionar tokens manualmente.