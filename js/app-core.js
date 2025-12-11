// js/app-core.js
// Punto de entrada para Prompt Shield (UI + consola + Prompt Fixer).

window.PromptShield = (function () {
  // Estado en memoria para reutilizar el último análisis en Prompt Fixer
  let lastAnalysisResult = null;

  // ==== API para pruebas en consola ====
  function analyzeFromConsole(text, paranoid = false) {
    if (!window.PromptShieldAnalysis || typeof window.PromptShieldAnalysis.analyze !== "function") {
      console.error("PromptShieldAnalysis.analyze no está disponible.");
      return null;
    }

    const result = window.PromptShieldAnalysis.analyze(text, { paranoid });
    console.log("Prompt Shield result:", result);
    return result;
  }

  // ==== Utilidades internas ====
  function $(id) {
    return document.getElementById(id);
  }

  function updateCharCounter(textarea, counterEl) {
    if (!textarea || !counterEl) return;
    const max = textarea.getAttribute("maxlength") || 4000;
    const current = textarea.value.length;
    counterEl.textContent = current + " / " + max;
  }

  function normalizeRiskLevel(raw) {
    if (!raw) return "none";
    const value = String(raw).toLowerCase();

    if (value.includes("high") || value.includes("alto")) return "high";
    if (value.includes("medium") || value.includes("medio") || value.includes("moderado")) return "medium";
    if (value.includes("low") || value.includes("bajo")) return "low";
    if (value.includes("none") || value.includes("ninguno")) return "none";

    return "none";
  }

  function setRiskBadge(riskLevel, badgeEl) {
    if (!badgeEl) return;

    const normalized = normalizeRiskLevel(riskLevel);
    badgeEl.classList.remove("risk-none", "risk-low", "risk-medium", "risk-high");

    let label = "-";
    let title = "";

    switch (normalized) {
      case "low":
        badgeEl.classList.add("risk-low");
        label = "Bajo";
        title = "Riesgo bajo: se detectan pocos datos sensibles.";
        break;
      case "medium":
        badgeEl.classList.add("risk-medium");
        label = "Medio";
        title = "Riesgo medio: revisa si puedes anonimizar o eliminar algunos datos.";
        break;
      case "high":
        badgeEl.classList.add("risk-high");
        label = "Alto";
        title = "Riesgo alto: contiene PII clara o datos muy sensibles. No pegues esto en la IA sin editar.";
        break;
      default:
        badgeEl.classList.add("risk-none");
        label = "-";
        title = "";
    }

    badgeEl.textContent = label;
    badgeEl.title = title;
  }

  function renderList(ul, items, emptyMessage) {
    if (!ul) return;
    ul.innerHTML = "";

    if (!items || !items.length) {
      if (emptyMessage) {
        const li = document.createElement("li");
        li.textContent = emptyMessage;
        ul.appendChild(li);
      }
      return;
    }

    items.forEach(function (item) {
      const li = document.createElement("li");

      if (typeof item === "string") {
        li.textContent = item;
      } else if (item && typeof item === "object") {
        li.textContent = item.message || item.text || JSON.stringify(item);
      } else {
        li.textContent = String(item);
      }

      ul.appendChild(li);
    });
  }

  // Renderizado especializado para hallazgos de privacidad (PII)
  function renderPrivacyFindings(ul, items, emptyMessage) {
    if (!ul) return;
    ul.innerHTML = "";

    if (!items || !items.length) {
      if (emptyMessage) {
        const li = document.createElement("li");
        li.textContent = emptyMessage;
        ul.appendChild(li);
      }
      return;
    }

    items.forEach(function (item) {
      const li = document.createElement("li");

      // Si el engine ya devuelve strings legibles, respétalos
      if (typeof item === "string") {
        li.textContent = item;
      } else if (item && typeof item === "object") {
        const type = item.type || "other";
        const value = item.value || "";
        let msg = "";

        switch (type) {
          case "email":
            msg = "Correo electrónico detectado: " + value;
            break;
          case "phone":
            msg = "Teléfono detectado: " + value;
            break;
          case "url":
            msg = "URL detectada: " + value;
            break;
          case "id":
          case "id_like":
            msg = "Identificador sensible detectado: " + value;
            break;
          case "name_like":
            msg = "Nombre detectado en el texto: " + value;
            break;
          default:
            msg = "Dato potencialmente sensible detectado: " + (value || JSON.stringify(item));
        }

        li.textContent = msg;
      } else {
        li.textContent = String(item);
      }

      ul.appendChild(li);
    });
  }

  function extractPrivacyFindings(result) {
    if (!result) return [];

    if (Array.isArray(result.privacyFindings)) return result.privacyFindings;
    if (Array.isArray(result.piiFindings)) return result.piiFindings;
    if (Array.isArray(result.detectedPII)) return result.detectedPII;
    if (Array.isArray(result.pii)) return result.pii;

    return [];
  }

  function extractQualityFindings(result) {
    if (!result) return [];

    if (Array.isArray(result.qualityFindings)) return result.qualityFindings;
    if (Array.isArray(result.qualityIssues)) return result.qualityIssues;

    // qualityFlags puede ser un objeto de flags booleanos
    if (result.qualityFlags && typeof result.qualityFlags === "object") {
      const messages = [];

      // Mapeo de flags técnicos -> mensajes en español
      const labelMap = {
        hasGoal: "Falta un objetivo claro (qué quieres que logre la IA).",
        hasContext: "Falta contexto suficiente (sobre el caso, negocio o datos relevantes).",
        hasInstructions: "Faltan instrucciones claras (cómo debe trabajar la IA paso a paso).",
        hasOutputFormat: "Falta especificar el formato de salida (lista, tabla, JSON, etc.).",
      };

      Object.keys(result.qualityFlags).forEach(function (key) {
        const value = result.qualityFlags[key];
        if (value === false) {
          const msg = labelMap[key] || ("Falta " + key);
          messages.push(msg);
        }
      });

      return messages;
    }

    if (Array.isArray(result.findings)) return result.findings;

    return [];
  }

  function extractSuggestions(result) {
    if (!result) return [];

    if (Array.isArray(result.suggestions)) return result.suggestions;
    if (Array.isArray(result.recommendations)) return result.recommendations;

    return [];
  }

  function setStatus(message) {
    const statusEl = $("status-message");
    if (!statusEl) return;

    statusEl.textContent = message;
  }

  function clearResults() {
    const riskBadge = $("risk-level");
    const qualityScore = $("quality-score");
    const privacyList = $("privacy-findings");
    const qualityList = $("quality-findings");
    const suggestionsList = $("suggestions-list");

    setRiskBadge(null, riskBadge);

    if (qualityScore) {
      qualityScore.textContent = "-";
    }

    if (privacyList) privacyList.innerHTML = "";
    if (qualityList) qualityList.innerHTML = "";
    if (suggestionsList) suggestionsList.innerHTML = "";

    // Limpiar estado de Prompt Fixer también
    lastAnalysisResult = null;
    const improvedOutput = $("improved-prompt-output");
    const btnRewrite = $("btn-rewrite");
    const btnCopyImproved = $("btn-copy-improved-prompt");

    if (improvedOutput) {
      improvedOutput.value = "";
    }
    if (btnRewrite) {
      btnRewrite.disabled = true;
    }
    if (btnCopyImproved) {
      btnCopyImproved.disabled = true;
    }

    setStatus(
      'Pega un prompt en el panel izquierdo y haz clic en "Auditar Prompt" para ver el análisis.'
    );
  }

  function renderAnalysis(result) {
    const riskBadge = $("risk-level");
    const qualityScore = $("quality-score");
    const privacyList = $("privacy-findings");
    const qualityList = $("quality-findings");
    const suggestionsList = $("suggestions-list");

    if (!result) {
      clearResults();
      setStatus("No se obtuvo ningún resultado. Intenta de nuevo.");
      return;
    }

    setRiskBadge(result.riskLevel, riskBadge);

    if (qualityScore) {
      if (typeof result.qualityScore === "number" && result.qualityScore > 0) {
        const rounded = Math.round(result.qualityScore);
        qualityScore.textContent = rounded + " / 100";
      } else {
        qualityScore.textContent = "-";
      }
    }

    const privacyFindings = extractPrivacyFindings(result);
    const qualityFindings = extractQualityFindings(result);
    const suggestions = extractSuggestions(result);

    // Usamos renderizado especializado para PII
    renderPrivacyFindings(privacyList, privacyFindings, "Sin hallazgos relevantes de PII.");

    // Y el render genérico para calidad y sugerencias
    renderList(
      qualityList,
      qualityFindings,
      "Sin hallazgos relevantes en la estructura del prompt."
    );
    renderList(suggestionsList, suggestions, "Sin sugerencias adicionales.");

    // Guardar resultado para Prompt Fixer y habilitar botón
    lastAnalysisResult = result;
    const btnRewrite = $("btn-rewrite");
    if (btnRewrite) {
      btnRewrite.disabled = false;
    }

    setStatus(
      "Análisis completado. Revisa el riesgo, los hallazgos y las sugerencias antes de enviar tu prompt a la IA."
    );
  }

  function copySuggestionsToClipboard() {
    const suggestionsList = $("suggestions-list");
    if (!suggestionsList) return;

    const items = Array.from(suggestionsList.querySelectorAll("li"))
      .map(function (li) {
        return li.textContent.trim();
      })
      .filter(Boolean);

    if (!items.length) {
      setStatus("No hay sugerencias para copiar en este momento.");
      return;
    }

    const text = items
      .map(function (item) {
        return "- " + item;
      })
      .join("\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(function () {
          setStatus("Sugerencias copiadas al portapapeles.");
        })
        .catch(function () {
          setStatus(
            "No se pudieron copiar las sugerencias. Copia manualmente desde la lista."
          );
        });
    } else {
      // Fallback para navegadores sin navigator.clipboard
      const temp = document.createElement("textarea");
      temp.value = text;
      temp.style.position = "fixed";
      temp.style.left = "-9999px";
      document.body.appendChild(temp);
      temp.select();

      try {
        document.execCommand("copy");
        setStatus("Sugerencias copiadas al portapapeles.");
      } catch (e) {
        setStatus(
          "No se pudieron copiar las sugerencias. Copia manualmente desde la lista."
        );
      } finally {
        document.body.removeChild(temp);
      }
    }
  }

  function copyImprovedPromptToClipboard() {
    const improvedOutput = $("improved-prompt-output");
    if (!improvedOutput) return;

    const text = (improvedOutput.value || "").trim();
    if (!text) {
      setStatus("No hay un prompt mejorado para copiar en este momento.");
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(function () {
          setStatus("Prompt mejorado copiado al portapapeles.");
        })
        .catch(function () {
          setStatus(
            "No se pudo copiar el prompt mejorado. Copia manualmente desde el panel."
          );
        });
    } else {
      const temp = document.createElement("textarea");
      temp.value = text;
      temp.style.position = "fixed";
      temp.style.left = "-9999px";
      document.body.appendChild(temp);
      temp.select();

      try {
        document.execCommand("copy");
        setStatus("Prompt mejorado copiado al portapapeles.");
      } catch (e) {
        setStatus(
          "No se pudo copiar el prompt mejorado. Copia manualmente desde el panel."
        );
      } finally {
        document.body.removeChild(temp);
      }
    }
  }

  function generateImprovedPrompt(promptInput, paranoidToggle) {
    if (!lastAnalysisResult) {
      setStatus("Primero audita el prompt antes de generar una versión mejorada.");
      return;
    }

    if (!window.PromptShieldRewriter || typeof window.PromptShieldRewriter.rewrite !== "function") {
      setStatus(
        "El módulo de reescritura no está disponible. Revisa que prompt-rewriter.js esté cargado."
      );
      return;
    }

    if (!promptInput) {
      setStatus("No se encontró el campo de prompt.");
      return;
    }

    const originalText = promptInput.value || "";
    if (!originalText.trim()) {
      setStatus("No hay prompt para reescribir. Pega un prompt primero.");
      return;
    }

    const improvedOutput = $("improved-prompt-output");
    const btnCopyImproved = $("btn-copy-improved-prompt");

    try {
      const paranoid = !!(paranoidToggle && paranoidToggle.checked);

      const rewriteResult = window.PromptShieldRewriter.rewrite(
        originalText,
        lastAnalysisResult,
        {
          language: "es",
          paranoid: paranoid,
        }
      );

      if (rewriteResult && rewriteResult.improvedPrompt) {
        if (improvedOutput) {
          improvedOutput.value = rewriteResult.improvedPrompt;
        }
        if (btnCopyImproved) {
          btnCopyImproved.disabled = false;
        }

        setStatus(
          "Prompt mejorado generado localmente. Revísalo antes de usarlo en la IA."
        );
      } else {
        setStatus(
          "No se pudo generar una versión mejorada. Revisa el análisis o intenta de nuevo."
        );
      }
    } catch (error) {
      console.error("Error al generar el prompt mejorado:", error);
      setStatus(
        "Ocurrió un error al generar la versión mejorada del prompt. Intenta de nuevo."
      );
    }
  }

  // ==== Inicialización de la UI ====
  function initUI() {
    const promptInput = $("prompt-input");
    const paranoidToggle = $("paranoid-toggle");
    const btnAudit = $("btn-audit");
    const btnClear = $("btn-clear");
    const btnCopySuggestions = $("btn-copy-suggestions");
    const btnRewrite = $("btn-rewrite");
    const btnCopyImproved = $("btn-copy-improved-prompt");
    const improvedOutput = $("improved-prompt-output");
    const charCounter = $("char-counter");

    // Si no encontramos el textarea o el botón principal, asumimos que sólo se
    // quiere usar la API de consola.
    if (!promptInput || !btnAudit) {
      return;
    }

    // Estado inicial
    updateCharCounter(promptInput, charCounter);
    clearResults();

    promptInput.addEventListener("input", function () {
      updateCharCounter(promptInput, charCounter);
      // Opcional: podrías invalidar lastAnalysisResult si quieres que el análisis
      // siempre corresponda al texto actual; por ahora lo dejamos tal cual.
    });

    btnAudit.addEventListener("click", function () {
      const text = promptInput.value.trim();

      if (!text) {
        setStatus("Pega un prompt antes de auditarlo.");
        clearResults();
        return;
      }

      if (!window.PromptShieldAnalysis || typeof window.PromptShieldAnalysis.analyze !== "function") {
        setStatus(
          "El motor de análisis no está disponible. Revisa que analysis-engine.js esté cargado."
        );
        return;
      }

      const paranoid = !!(paranoidToggle && paranoidToggle.checked);

      try {
        setStatus("Analizando prompt…");
        const result = window.PromptShieldAnalysis.analyze(text, { paranoid: paranoid });
        renderAnalysis(result);
      } catch (error) {
        console.error("Error al analizar el prompt:", error);
        setStatus(
          "Ocurrió un error durante el análisis. Intenta de nuevo o recarga la página."
        );
      }
    });

    if (btnClear) {
      btnClear.addEventListener("click", function () {
        promptInput.value = "";
        updateCharCounter(promptInput, charCounter);
        clearResults();
      });
    }

    if (btnCopySuggestions) {
      btnCopySuggestions.addEventListener("click", function () {
        copySuggestionsToClipboard();
      });
    }

    // Wiring Sprint 3: Prompt Fixer
    if (btnRewrite) {
      btnRewrite.addEventListener("click", function () {
        generateImprovedPrompt(promptInput, paranoidToggle);
      });
    }

    if (btnCopyImproved && improvedOutput) {
      btnCopyImproved.addEventListener("click", function () {
        copyImprovedPromptToClipboard();
      });
    }
  }

  // Lanzar initUI cuando el DOM esté listo
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUI);
  } else {
    initUI();
  }

  // ==== API pública ====
  return {
    analyzeFromConsole: analyzeFromConsole,
    initUI: initUI,
  };
})();
