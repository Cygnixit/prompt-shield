# Changelog

Todas las versiones notables de **Prompt Shield** se documentan en este archivo.

> Formato inspirado en [Keep a Changelog](https://keepachangelog.com/) (adaptado) y versionado semántico.

---

## [0.3.0] – Sprint 3 · Prompt Fixer local (beta)

**Estado:** publicado en rama `main`.

### Añadido
- Panel **"Prompt mejorado (beta, local)"** en la columna derecha de la UI.
- Botón **"Generar versión mejorada"** en el panel de Prompt.
- Botón **"Copiar prompt mejorado"** bajo el textarea del prompt mejorado.
- Módulo `js/prompt-rewriter.js` con:
  - Función pública `PromptShieldRewriter.rewrite(originalPrompt, analysis, options)`.
  - Anonimización de PII (emails, teléfonos, nombres, URLs, IDs) usando placeholders legibles.
  - Generación de estructura estándar: **Objetivo / Contexto / Instrucciones / Formato de salida**.
  - Heurística específica para prompts estructurados con secciones `Contexto / Rol / Especificidad / Objetivo`.
- Estado `lastAnalysisResult` en `js/app-core.js` para reutilizar el último análisis en la reescritura.
- Etiqueta **`ZERO-TRUST · 100% LOCAL`** en el panel de Prompt Fixer.
- README ampliado con:
  - Descripción de la arquitectura Zero-Trust.
  - Explicación del Prompt Fixer local.
  - Limitaciones conocidas y visión futura del "Modo IA avanzado".

### Cambiado
- `index.html` actualizado para incluir:
  - Nuevo panel de Prompt mejorado.
  - Botones adicionales en la sección de acciones del prompt.
  - Inclusión del script `js/prompt-rewriter.js` antes de `js/app-core.js`.
- `css/styles.css` extendido con estilos para:
  - Panel de Prompt mejorado.
  - Textarea de salida.
  - Botones y chips relacionados.
- `js/app-core.js` refactorizado para:
  - Manejar el estado del Prompt Fixer.
  - Habilitar/deshabilitar botones según el ciclo de análisis.
  - Integrar la llamada a `PromptShieldRewriter.rewrite(...)`.

### Notas
- Todo el análisis y la reescritura siguen ocurriendo **100% en el navegador**.
- No hay integración con APIs de IA externa en esta versión.
- El checkbox "Modo IA avanzado (próximamente)" es solo un indicador visual de una posible evolución futura.

---

## [0.2.0] – Sprint 2 · UI de auditoría y mapeo de análisis

**Estado:** integrado en `main` como base de la UI actual.

### Añadido
- Interfaz completa en `index.html` para:
  - Panel de **Ajustes** con modo paranoico.
  - Panel de **Prompt** con textarea, contador de caracteres y botones:
    - "Auditar Prompt".
    - "Limpiar".
  - Panel de **Resultados** con:
    - Resumen: nivel de riesgo + score de calidad.
    - Hallazgos de **Privacidad**.
    - Hallazgos de **Estructura del prompt**.
    - Lista de **Sugerencias**.
  - Panel de **Privacidad y modelo de seguridad**.
  - Panel de **"Próximamente · Prompt Shield Playbooks"**.
- `css/styles.css` con diseño dark, paneles, badges de riesgo y estilos para listas de hallazgos/sugerencias.
- Mapeo de resultados del motor de análisis a mensajes legibles en español.
- Botón **"Copiar sugerencias"**.

### Cambiado
- `js/app-core.js` convertido en punto de entrada de la UI:
  - Wire-up de eventos para botones.
  - Renderizado de badges de riesgo.
  - Renderizado de hallazgos y sugerencias.
  - Mensajes de estado para guiar al usuario.

---

## [0.1.0] – Sprint 1 · Motor de análisis inicial

**Estado:** primera versión funcional del core, orientada a uso por consola.

### Añadido
- `PIIAnalyzer` (`js/pii-analyzer.js`):
  - Detección heurística de:
    - Emails.
    - Teléfonos.
    - URLs.
    - IDs tipo RFC/CURP-like (en modo paranoico).
    - Posibles nombres (`name_like`) en modo paranoico.
- `PromptQualityEvaluator` (`js/quality-evaluator.js`):
  - Flags: `hasGoal`, `hasContext`, `hasInstructions`, `hasOutputFormat`.
  - Cálculo de `qualityScore`.
- `PromptShieldAnalysis` (`js/analysis-engine.js`):
  - Combina PII + calidad.
  - Devuelve: `riskLevel`, `detectedPII`, `qualityScore`, `qualityFlags`, `findings`, `suggestions`, etc.
- `PromptShield.analyzeFromConsole(text, paranoid)` expuesto en `js/app-core.js` para pruebas rápidas desde la consola del navegador.

---

## [Unreleased]

Ideas y posibles líneas futuras (no implementadas en la versión actual):

- "Modo IA avanzado" opcional:
  - Integración con LLMs vía API o endpoint configurable por el usuario para reescritura avanzada de prompts.
  - Separación clara entre edición **Zero-Trust 100% local** y edición **Pro con IA remota**.
- Mejoras de UX:
  - Agrupación de detecciones `name_like` en modo paranoico para reducir ruido.
  - Calibración fina del score de calidad.
- Playbooks específicos por dominio (legal, marketing, soporte, desarrollo) basados en el motor de auditoría actual.

