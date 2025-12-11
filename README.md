# 🛡️ Prompt Shield — Auditor de Prompts Privado

**Prompt Shield** es una herramienta web estática para **auditar y mejorar prompts de forma privada**, con una filosofía clara: **Zero-Trust by design**.

- Todo el análisis ocurre **100% localmente en tu navegador**.
- No hay backend, ni base de datos, ni trazas de tus prompts.
- Ideal para revisar prompts antes de pegarlos en ChatGPT, Gemini, Claude, etc.

> ⚠️ Prompt Shield es una herramienta en beta. No ofrece garantías legales ni reemplaza una revisión de seguridad formal.

---

## 🚀 ¿Qué hace Prompt Shield?

### 1. Auditoría de privacidad (PII)

Detecta posibles datos sensibles en tu prompt, como:

- Correos electrónicos.
- Números de teléfono.
- URLs.
- Identificadores tipo RFC/CURP-like (en modo paranoico).
- Palabras que podrían ser nombres propios (en modo paranoico).

Los hallazgos se muestran en la sección **Hallazgos → Privacidad**, con mensajes legibles en español, por ejemplo:

- `Correo electrónico detectado: ...`
- `Teléfono detectado: ...`
- `URL detectada: ...`
- `Nombre detectado en el texto: ...`

### 2. Auditoría de estructura y calidad del prompt

Evalúa si tu prompt incluye los elementos clave para trabajar bien con un modelo de IA:

- **Objetivo** (qué quieres lograr).
- **Contexto** (información relevante mínima).
- **Instrucciones** (cómo debe trabajar la IA).
- **Formato de salida** (lista, tabla, JSON, etc.).

La auditoría devuelve:

- Un **score de calidad (0–100)**.
- Hallazgos en la sección **Estructura del prompt**, por ejemplo:
  - `Falta un objetivo claro...`
  - `Falta contexto suficiente...`
  - `Faltan instrucciones claras...`
  - `Falta especificar el formato de salida...`

### 3. Sugerencias accionables

En función de los hallazgos, Prompt Shield genera una lista de sugerencias para mejorar tu prompt. Puedes copiarlas con un clic desde el botón **"Copiar sugerencias"**.

### 4. Prompt Fixer local (beta)

Además de auditar, Prompt Shield incluye un **Prompt Fixer local (beta)** que genera una **versión mejorada y anonimizada** de tu prompt.

- Nuevo botón: **"Generar versión mejorada"** (se habilita después de analizar el prompt).
- Nuevo panel: **"Prompt mejorado (beta, local)"** con:
  - Un textarea de solo lectura con el prompt reescrito.
  - Botón **"Copiar prompt mejorado"**.
  - Etiqueta **`ZERO-TRUST · 100% LOCAL`**.

#### ¿Qué hace el Prompt Fixer?

- **Anonimiza PII** detectada:
  - Emails → `[correo_contacto]`
  - Teléfonos → `[telefono_contacto]`
  - Posibles nombres → `[nombre_persona]`
  - URLs → `[url_referencia]`
  - IDs → `[identificador_sensible]`

- **Genera una estructura estándar** en la parte superior del prompt mejorado (cuando aplica):

  ```text
  Objetivo:
  ...

  Contexto:
  ...

  Instrucciones:
  ...

  Formato de salida:
  ...
  ```

- **Conserva el contenido original anonimizado** al final, dentro de un bloque:

  ```text
  Contenido original (anonimizado):
  <<<
  ...
  >>>
  ```

- Incluye una heurística específica para prompts ya estructurados con secciones del tipo:

  ```text
  - Contexto: ...
  - Rol: ...
  - Especificidad: ...
  - Objetivo: ...
  ```

  En estos casos, Prompt Shield reordena y compacta esa información en la estructura estándar Objetivo / Contexto / Instrucciones / Formato.

> 🔒 Importante: el Prompt Fixer **no llama a ningún modelo de IA externo**. Toda la reescritura se hace con lógica determinista en JavaScript, ejecutándose en tu navegador.

---

## 🧱 Arquitectura y filosofía Zero-Trust

Prompt Shield está pensado como una **web app estática**:

- HTML + CSS + JavaScript puro.
- Servido desde GitHub Pages (o cualquier hosting estático).
- Sin backend, sin base de datos, sin cookies de seguimiento.

### Componentes principales

- `js/pii-analyzer.js`
  - Motor de detección de PII.
  - Usa expresiones regulares heurísticas para encontrar emails, teléfonos, URLs, IDs y posibles nombres.
  - Soporta un modo **paranoico** para detección más agresiva.

- `js/quality-evaluator.js`
  - Evalúa la estructura del prompt.
  - Devuelve flags como `hasGoal`, `hasContext`, `hasInstructions`, `hasOutputFormat` y un `qualityScore`.

- `js/analysis-engine.js`
  - Combina el resultado de PII + calidad en un objeto de análisis unificado.
  - Calcula `riskLevel`, `qualityScore`, `qualityFlags`, `detectedPII`, `findings`, `suggestions`, etc.

- `js/app-core.js`
  - Orquesta la **UI principal**.
  - Maneja eventos de botones, actualización de paneles, copiado al portapapeles, etc.
  - Gestiona el `lastAnalysisResult` para permitir generar la versión mejorada después de un análisis.

- `js/prompt-rewriter.js`
  - Implementa el **Prompt Fixer local (beta)**.
  - Expoone `window.PromptShieldRewriter.rewrite(originalPrompt, analysis, options)`.
  - Se apoya en `detectedPII` y `qualityFlags` para anonimizar y reestructurar.

---

## 🕹️ Cómo usar Prompt Shield

1. **Abre la página de Prompt Shield** en tu navegador.
2. (Opcional) Activa el **Modo paranoico** si trabajas con datos muy sensibles y quieres detecciones más agresivas de PII.
3. Pega tu prompt en el panel de **Prompt**.
4. Haz clic en **"Auditar Prompt"**.
5. Revisa:
   - El **nivel de riesgo**.
   - El **score de calidad**.
   - Los **hallazgos de privacidad**.
   - Los **hallazgos de estructura del prompt**.
   - La lista de **sugerencias**.
6. (Opcional) Haz clic en **"Generar versión mejorada"**. Se generará un **prompt mejorado (beta, local)** basado en:
   - El prompt original.
   - Los hallazgos de PII.
   - Los flags de calidad.
7. Usa los botones **"Copiar sugerencias"** y **"Copiar prompt mejorado"** según lo necesites.

---

## 🔐 Modo paranoico

El **Modo paranoico** activa reglas adicionales en el analizador de PII:

- Detecta más patrones de IDs.
- Detecta más palabras que pueden ser nombres (`name_like`).

Esto puede generar **más falsos positivos**, pero es útil si prefieres pecar de prudente. El propio texto de ayuda del toggle lo aclara.

---

## 🧪 Limitaciones conocidas

- El análisis de PII se basa en **expresiones regulares heurísticas**. Puede haber falsos positivos y falsos negativos.
- La evaluación de calidad del prompt es **simplificada**: se centra en la presencia de objetivo, contexto, instrucciones y formato.
- El Prompt Fixer local **no comprende semánticamente** el contenido; aplica reglas deterministas:
  - Anonimización por coincidencia de texto.
  - Plantillas estáticas para secciones.
  - Una heurística concreta para prompts con secciones `Contexto/Rol/Especificidad/Objetivo`.
- No hay integración directa con modelos de IA (OpenAI, Anthropic, etc.) en esta versión.

---

## 🌱 Futuro: “Modo IA avanzado” (idea de diseño)

En la interfaz se muestra un checkbox deshabilitado **"Modo IA avanzado (próximamente)"**. Esto no está implementado todavía, pero marca una posible evolución del proyecto:

- Integrar un **LLM externo vía API** (u otro endpoint configurable por el usuario) para:
  - Reescrituras más profundas y contextuales.
  - Optimización de prompts por modelo / tarea.
- Mantener una clara separación entre:
  - **Prompt Shield (Zero-Trust, 100% local)**.
  - Una posible variante **"Pro"** con backend y IA remota, activable solo de forma explícita por el usuario.

Por ahora, Prompt Shield se mantiene como herramienta **estrictamente local**.

---

## 🛠️ Desarrollo

### Requisitos

- Navegador moderno (Chrome, Firefox, Edge, etc.).
- Servidor estático opcional para pruebas locales (o abrir directamente `index.html`).

### Estructura de archivos (simplificada)

```text
index.html
css/
  styles.css
js/
  pii-analyzer.js
  quality-evaluator.js
  analysis-engine.js
  prompt-rewriter.js
  app-core.js
```

### Flujo de desarrollo sugerido

1. Crear rama de feature desde `dev`.
2. Trabajar sobre los módulos correspondientes (manteniendo la filosofía Zero-Trust).
3. Probar en local abriendo `index.html`.
4. Hacer commit con mensajes claros:
   - `feat(...)`, `fix(...)`, `refactor(...)`, etc.
5. Abrir Pull Request hacia `dev`, luego hacia `main`.

---

## 📦 Versión actual

- Versión: `v0.3.0` (Sprint 3 – Prompt Fixer local beta).
- Cambios clave del Sprint 3:
  - Nuevo panel **"Prompt mejorado (beta, local)"**.
  - Nuevo botón **"Generar versión mejorada"**.
  - Módulo `PromptShieldRewriter` para reescritura local y anonimización.
  - Mejor integración de estado (`lastAnalysisResult`) en la UI.

---

## ⚖️ Licencia y descargo de responsabilidad

- Prompt Shield se ofrece como herramienta en beta, **sin garantías** de ningún tipo.
- El uso es responsabilidad del usuario final.
- No reemplaza auditorías de seguridad, revisiones legales ni políticas internas de tu organización.

---

## 🙋 Preguntas y feedback

Si encuentras un falso positivo extraño, un bug o tienes ideas para futuras mejoras (por ejemplo, tipos de PII adicionales, nuevas heurísticas o plantillas específicas por dominio), puedes documentarlo como issue o comentario en el repositorio.

Prompt Shield nació para ayudarte a **pensar mejor tus prompts antes de pegarlos en la IA**, no para reemplazar tu criterio. Usa esta herramienta como aliada, no como autoridad absoluta.

