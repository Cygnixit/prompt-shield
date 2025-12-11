// js/analysis-engine.js
// Fachada que combina PIIAnalyzer y PromptQualityEvaluator en un solo resultado.

window.PromptShieldAnalysis = (function () {
  /**
   * Analiza un prompt.
   * options: { paranoid: boolean }
   */
  function analyze(promptText, options = {}) {
    const text = (promptText || "").toString();
    const paranoid = !!options.paranoid;

    const detectedPII = window.PIIAnalyzer.analyze(text, { paranoid });
    const quality = window.PromptQualityEvaluator.evaluate(text);

    const riskLevel = calculateRiskLevel(detectedPII, paranoid);
    const findings = buildFindings(detectedPII, quality.flags);
    const suggestions = buildSuggestions(detectedPII, quality.flags);

    return {
      promptLength: text.length,
      paranoid,
      riskLevel,       // "low" | "medium" | "high"
      detectedPII,     // array
      qualityScore: quality.score,
      qualityFlags: quality.flags,
      findings,        // array de strings
      suggestions,     // array de strings
    };
  }

  function calculateRiskLevel(detectedPII, paranoid) {
    const count = detectedPII.length;

    if (count === 0) return "low";
    if (count <= 3) return paranoid ? "medium" : "low";
    if (count <= 6) return "medium";
    return "high";
  }

  function buildFindings(detectedPII, flags) {
    const list = [];

    if (detectedPII.length === 0) {
      list.push(
        "No se detectó PII obvia en el prompt (esto no es garantía absoluta)."
      );
    } else {
      const byType = groupByType(detectedPII);
      Object.keys(byType).forEach((type) => {
        list.push(
          `Se detectaron ${byType[type].length} elemento(s) de tipo ${type}.`
        );
      });
    }

    if (!flags.hasGoal) {
      list.push("No se identificó un objetivo claro en el prompt.");
    }
    if (!flags.hasContext) {
      list.push(
        "El contexto parece limitado; podrías dar más detalles de la situación."
      );
    }
    if (!flags.hasInstructions) {
      list.push(
        "No se encontraron instrucciones explícitas sobre qué debe hacer la IA."
      );
    }
    if (!flags.hasOutputFormat) {
      list.push(
        "No se especifica el formato de salida esperado (tabla, lista, JSON, etc.)."
      );
    }

    return list;
  }

  function buildSuggestions(detectedPII, flags) {
    const suggestions = [];

    if (detectedPII.length > 0) {
      suggestions.push(
        "Revisa si realmente necesitas incluir todos los datos detectados como PII. Redacta o anonimizalos cuando sea posible."
      );
    } else {
      suggestions.push(
        "Aunque no se detectó PII obvia, asume siempre que tu prompt puede contener información sensible y compártelo con cuidado."
      );
    }

    if (!flags.hasGoal) {
      suggestions.push(
        "Añade una frase explícita de objetivo, por ejemplo: \"Mi objetivo es que analices...\"."
      );
    }
    if (!flags.hasContext) {
      suggestions.push(
        "Incluye un párrafo de contexto explicando la situación, los datos clave y el propósito general."
      );
    }
    if (!flags.hasInstructions) {
      suggestions.push(
        "Especifica instrucciones claras: qué debe hacer la IA, en qué orden o con qué enfoque."
      );
    }
    if (!flags.hasOutputFormat) {
      suggestions.push(
        "Indica el formato de salida deseado, por ejemplo: \"responde en una tabla con columnas X, Y, Z\" o \"devuélvelo en JSON\"."
      );
    }

    return suggestions;
  }

  function groupByType(items) {
    const map = {};
    for (const item of items) {
      if (!map[item.type]) map[item.type] = [];
      map[item.type].push(item);
    }
    return map;
  }

  return {
    analyze,
  };
})();
