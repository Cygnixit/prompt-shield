// js/prompt-rewriter.js
// Módulo de reescritura local para Prompt Shield (Prompt Fixer).
// No usa ningún modelo externo. Todo corre 100% en el navegador.

(function (global) {
  "use strict";

  /**
   * Escapa una cadena para usarla de forma literal en una RegExp.
   * @param {string} value
   * @returns {string}
   */
  function escapeForRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Devuelve un placeholder legible en función del tipo de PII.
   * @param {string} type
   * @returns {string}
   */
  function getPlaceholderForType(type) {
    switch (String(type || "").toLowerCase()) {
      case "email":
        return "[correo_contacto]";
      case "phone":
      case "phone_number":
        return "[telefono_contacto]";
      case "name":
      case "name_like":
        return "[nombre_persona]";
      case "url":
        return "[url_referencia]";
      case "id":
      case "id_like":
        return "[identificador_sensible]";
      default:
        return "[dato_sensible]";
    }
  }

  /**
   * Intenta obtener una lista de items de PII desde distintas propiedades
   * posibles del resultado de análisis.
   * @param {Object} analysis
   * @returns {Array<{type: string, value: string, index?: number}>}
   */
  function getDetectedPII(analysis) {
    if (!analysis || typeof analysis !== "object") return [];

    if (Array.isArray(analysis.detectedPII)) return analysis.detectedPII;
    if (Array.isArray(analysis.privacyFindings)) return analysis.privacyFindings;
    if (Array.isArray(analysis.piiFindings)) return analysis.piiFindings;
    if (Array.isArray(analysis.pii)) return analysis.pii;

    return [];
  }

  /**
   * Decide si un item type=name_like debería realmente ser reemplazado.
   * Usa heurísticas suaves + contexto alrededor del índice.
   *
   * @param {{type:string, value:string, index?:number}} item
   * @param {string} fullText
   * @returns {boolean}
   */
  function shouldReplaceNameLike(item, fullText) {
    if (!item) return false;

    var value = item.value != null ? String(item.value).trim() : "";
    if (!value) return false;

    var lower = value.toLowerCase();

    // 1) Palabras muy cortas (tipo "Me", "Mi") normalmente no las queremos borrar
    if (value.length <= 2) {
      return false;
    }

    // 2) Blacklist muy simple de palabras que sabemos que no son nombres
    var blacklist = [
      "ayúdame",
      "ayudame",
      "hola",
      "gracias",
      "contrato",
      "cliente",
      "datos",
      "internos",
      "correo",
      "teléfono",
      "telefono",
      "acuerdo",
      "acme"
    ];

    if (blacklist.indexOf(lower) !== -1) {
      return false;
    }

    // 3) Contexto previo: sólo reemplazamos si aparece cerca de frases de presentación
    //    como "me llamo", "mi nombre es", "soy", "se llama", etc.
    var idx = typeof item.index === "number" ? item.index : -1;
    if (idx >= 0 && typeof fullText === "string") {
      var start = Math.max(0, idx - 30);
      var before = fullText.slice(start, idx).toLowerCase();

      var contextPatterns = [
        "me llamo",
        "mi nombre es",
        "soy ",
        "se llama",
        "nombre del cliente",
        "nombre del usuario"
      ];

      for (var i = 0; i < contextPatterns.length; i++) {
        if (before.indexOf(contextPatterns[i]) !== -1) {
          return true; // aquí sí parece un nombre real
        }
      }
    }

    // Si no hay contexto “de nombre” y no supera los filtros,
    // lo tratamos como falso positivo y NO lo reemplazamos.
    return false;
  }

  /**
   * Reemplaza valores PII por placeholders en el prompt original.
   * @param {string} originalPrompt
   * @param {Array<{type: string, value: string, index?: number}>} detectedPII
   * @returns {{ anonymizedPrompt: string, replacements: Array<{original: string, placeholder: string, type: string}> }}
   */
  function anonymizePrompt(originalPrompt, detectedPII) {
    var anonymized = originalPrompt || "";
    var replacements = [];

    if (!anonymized || !Array.isArray(detectedPII) || !detectedPII.length) {
      return { anonymizedPrompt: anonymized, replacements: replacements };
    }

    detectedPII.forEach(function (item) {
      if (!item) return;
      var value = item.value != null ? String(item.value) : "";
      if (!value) return;

      var type = String(item.type || "").toLowerCase();

      // Filtro específico para name_like
      if (type === "name_like" && !shouldReplaceNameLike(item, anonymized)) {
        return; // no lo reemplazamos
      }

      var placeholder = getPlaceholderForType(type);

      // Evitar duplicar entradas de replacements para el mismo valor + placeholder
      var alreadyRegistered = replacements.some(function (r) {
        return r.original === value && r.placeholder === placeholder;
      });

      var escaped = escapeForRegex(value);
      var regex = new RegExp(escaped, "g");

      if (regex.test(anonymized)) {
        anonymized = anonymized.replace(regex, placeholder);
        if (!alreadyRegistered) {
          replacements.push({
            original: value,
            placeholder: placeholder,
            type: item.type || "generic"
          });
        }
      }
    });

    return { anonymizedPrompt: anonymized, replacements: replacements };
  }

  /**
   * Construye secciones adicionales (Objetivo, Contexto, Instrucciones, Formato) en base a qualityFlags.
   * @param {Object} qualityFlags
   * @param {Object} options
   * @returns {{ sections: string[], addedSections: string[] }}
   */
  function buildSections(qualityFlags, options) {
    var flags = qualityFlags || {};
    var opts = options || {};
    var lang = (opts.language || "es").toLowerCase();

    var sections = [];
    var addedSections = [];

    // Por ahora, solo plantillas en español.
    if (lang === "es") {
      if (flags.hasGoal === false) {
        sections.push(
          "Objetivo:\n" +
            "[Especifica de forma clara qué necesitas que haga la IA con este contenido.]\n"
        );
        addedSections.push("goal");
      }

      if (flags.hasContext === false) {
        sections.push(
          "Contexto:\n" +
            "[Resume aquí solo la información necesaria (sin PII) para que la IA entienda la situación.]\n"
        );
        addedSections.push("context");
      }

      if (flags.hasInstructions === false) {
        sections.push(
          "Instrucciones:\n" +
            "- [Indica los pasos o criterios que la IA debe seguir.]\n" +
            "- [Añade restricciones importantes (tono, límite de tokens, idiomas, etc.).]\n"
        );
        addedSections.push("instructions");
      }

      if (flags.hasOutputFormat === false) {
        sections.push(
          "Formato de salida:\n" +
            "- [Texto libre, lista, tabla, JSON, etc.]\n" +
            "- [Si usas JSON, indica las claves exactas que necesitas.]\n"
        );
        addedSections.push("outputFormat");
      }
    }

    return {
      sections: sections,
      addedSections: addedSections
    };
  }

  /**
   * Ensambla el prompt mejorado con secciones + contenido original anonimizado.
   * @param {string} anonymizedPrompt
   * @param {string[]} sections
   * @returns {string}
   */
  function buildImprovedPrompt(anonymizedPrompt, sections) {
    var parts = [];

    if (Array.isArray(sections) && sections.length > 0) {
      parts.push(sections.join("\n"));
    }

    parts.push(
      "Contenido original (anonimizado):\n" +
        "<<<\n" +
        (anonymizedPrompt || "") +
        "\n>>>\n"
    );

    return parts.join("\n").trim();
  }

  // ============================================================
  //  HEURÍSTICAS AVANZADAS – CASO PROMPT 1 (secciones etiquetadas)
  // ============================================================

  /**
   * Intenta parsear secciones tipo:
   * - Contexto: ...
   * - Rol: ...
   * - Especificidad: ...
   * - Objetivo: ...
   *
   * @param {string} text
   * @returns {null | { contexto?: string, rol?: string, especificidad?: string, objetivo?: string }}
   */
  function parseLabeledSections(text) {
    if (!text) return null;
    var t = String(text);

    // Regex sencillos línea a línea
    var contextoMatch = t.match(/^-+\s*Contexto:\s*([\s\S]*?)(?:\n-|\n*$)/im);
    var rolMatch = t.match(/^-+\s*Rol:\s*([\s\S]*?)(?:\n-|\n*$)/im);
    var especificidadMatch = t.match(/^-+\s*Especificidad:\s*([\s\S]*?)(?:\n-|\n*$)/im);
    var objetivoMatch = t.match(/^-+\s*Objetivo:\s*([\s\S]*?)(?:\n-|\n*$)/im);

    var foundAny =
      (contextoMatch && contextoMatch[1]) ||
      (rolMatch && rolMatch[1]) ||
      (especificidadMatch && especificidadMatch[1]) ||
      (objetivoMatch && objetivoMatch[1]);

    if (!foundAny) return null;

    var sections = {};

    if (contextoMatch && contextoMatch[1]) {
      sections.contexto = contextoMatch[1].trim();
    }
    if (rolMatch && rolMatch[1]) {
      sections.rol = rolMatch[1].trim();
    }
    if (especificidadMatch && especificidadMatch[1]) {
      sections.especificidad = especificidadMatch[1].trim();
    }
    if (objetivoMatch && objetivoMatch[1]) {
      sections.objetivo = objetivoMatch[1].trim();
    }

    return sections;
  }

  /**
   * Construye un prompt mejorado aprovechando las secciones estructuradas.
   *
   * @param {{ contexto?: string, rol?: string, especificidad?: string, objetivo?: string }} sections
   * @returns {{ improvedPrompt: string, addedSections: string[] }}
   */
  function buildImprovedFromStructured(sections) {
    var parts = [];
    var added = [];

    if (sections.objetivo) {
      parts.push("Objetivo:\n" + sections.objetivo.trim() + "\n");
      added.push("goal");
    }

    if (sections.contexto) {
      parts.push("Contexto:\n" + sections.contexto.trim() + "\n");
      added.push("context");
    }

    var instruccionesLines = [];

    if (sections.rol) {
  var rolText = sections.rol.trim();
  var lowerRol = rolText.toLowerCase();

  if (lowerRol.startsWith("actúa como") || lowerRol.startsWith("actua como")) {
    // Ya viene con la fórmula, solo normalizamos el punto final
    // Quitamos puntos finales extra
    rolText = rolText.replace(/\.+\s*$/, "");
    instruccionesLines.push(rolText + ".");
  } else {
    instruccionesLines.push("Actúa como " + rolText.replace(/\.+\s*$/, "") + ".");
  }
}

    if (sections.especificidad) {
      instruccionesLines.push(
        "Ten en cuenta lo siguiente sobre la situación o el estado actual:\n" +
          "- " +
          sections.especificidad.trim()
      );
    }

    if (instruccionesLines.length > 0) {
      parts.push("Instrucciones:\n" + instruccionesLines.join("\n") + "\n");
      added.push("instructions");
    }

    // Formato de salida mínimo (podemos ir afinando después según keywords)
    parts.push(
      "Formato de salida:\n" +
        "- Entrega el resultado como un texto listo para usar.\n" +
        "- Usa un tono claro y honesto.\n"
    );
    added.push("outputFormat");

    return {
      improvedPrompt: parts.join("\n").trim(),
      addedSections: added
    };
  }

  /**
   * Intenta aplicar heurísticas avanzadas antes de las plantillas genéricas.
   *
   * @param {string} anonymizedPrompt
   * @param {Object} analysis
   * @param {Object} options
   * @returns {null | { improvedPrompt: string, addedSections: string[] }}
   */
  function tryAdvancedHeuristics(anonymizedPrompt, analysis, options) {
    var text = anonymizedPrompt || "";

    // 1) Caso: secciones etiquetadas tipo Prompt 1
    var structured = parseLabeledSections(text);
    if (structured) {
      return buildImprovedFromStructured(structured);
    }

    // Aquí más adelante podríamos añadir:
    // - extracción de objetivo desde texto libre (Prompt 2).
    // - plantillas específicas según dominio detectado.
    return null;
  }

  // ============================================================

  /**
   * Reescribe un prompt para que sea más seguro y mejor estructurado,
   * de forma 100% local y determinista (sin LLMs).
   *
   * @param {string} originalPrompt
   * @param {Object} analysis
   * @param {Object} [options]
   * @returns {{ improvedPrompt: string, replacements: Array, addedSections: string[] }}
   */
  function rewrite(originalPrompt, analysis, options) {
    var safeOriginal = originalPrompt != null ? String(originalPrompt) : "";
    var analysisObj = analysis || {};
    var opts = options || {};

    // 1) PII
    var detectedPII = getDetectedPII(analysisObj);
    var anonResult = anonymizePrompt(safeOriginal, detectedPII);

    // 2) Heurísticas avanzadas (Prompt 1, etc.)
    var advanced = tryAdvancedHeuristics(anonResult.anonymizedPrompt, analysisObj, opts);
    if (advanced && advanced.improvedPrompt) {
      // Adjuntamos siempre el contenido original anon. al final
      var finalPrompt =
        advanced.improvedPrompt +
        "\n\n" +
        "Contenido original (anonimizado):\n<<<\n" +
        anonResult.anonymizedPrompt +
        "\n>>>\n";

      return {
        improvedPrompt: finalPrompt.trim(),
        replacements: anonResult.replacements || [],
        addedSections: advanced.addedSections || []
      };
    }

    // 3) Si no aplica avanzado, usar las plantillas genéricas actuales
    var qualityFlags = analysisObj.qualityFlags || {};
    var sectionsInfo = buildSections(qualityFlags, opts);
    var improvedPrompt = buildImprovedPrompt(
      anonResult.anonymizedPrompt,
      sectionsInfo.sections
    );

    return {
      improvedPrompt: improvedPrompt,
      replacements: anonResult.replacements || [],
      addedSections: sectionsInfo.addedSections || []
    };
  }

  // Exportar en el objeto global
  var PromptShieldRewriter = {
    rewrite: rewrite
  };

  global.PromptShieldRewriter = PromptShieldRewriter;
})(window);
