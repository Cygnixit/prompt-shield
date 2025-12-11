// js/quality-evaluator.js
// Evaluador de calidad de prompt para Prompt Shield.

window.PromptQualityEvaluator = (function () {
  /**
   * Evalúa la estructura básica del prompt.
   * Retorna: { score, flags }
   * flags = { hasGoal, hasContext, hasInstructions, hasOutputFormat }
   */
  function evaluate(text) {
    const normalized = (text || "").toString().trim();

    const flags = {
      hasGoal: detectGoal(normalized),
      hasContext: detectContext(normalized),
      hasInstructions: detectInstructions(normalized),
      hasOutputFormat: detectOutputFormat(normalized),
    };

    const score = calculateScore(flags);

    return {
      score,
      flags,
    };
  }

  function detectGoal(text) {
    if (!text) return false;
    const patterns = [
      /mi objetivo es/i,
      /quiero que/i,
      /necesito que/i,
      /tu objetivo es/i,
      /the goal is/i,
      /your goal is/i,
    ];
    return patterns.some((re) => re.test(text));
  }

  function detectContext(text) {
    if (!text) return false;
    if (text.length > 300) return true;

    const patterns = [
      /contexto/i,
      /situación/i,
      /escenario/i,
      /background/i,
      /here is some context/i,
    ];
    return patterns.some((re) => re.test(text));
  }

  function detectInstructions(text) {
    if (!text) return false;
    const patterns = [
      /sigue estos pasos/i,
      /paso a paso/i,
      /haz lo siguiente/i,
      /instrucciones:/i,
      /step by step/i,
      /follow these steps/i,
      /\bexplica\b/i,
      /\bresponde\b/i,
    ];
    return patterns.some((re) => re.test(text));
  }

  function detectOutputFormat(text) {
    if (!text) return false;
    const patterns = [
      /en formato tabla/i,
      /en formato json/i,
      /devuélvelo en json/i,
      /responde en una lista/i,
      /usa viñetas/i,
      /bullets/i,
      /markdown/i,
      /estructura de columnas/i,
    ];
    return patterns.some((re) => re.test(text));
  }

  function calculateScore(flags) {
    // Peso simple v1: cada flag vale 25 puntos.
    let score = 0;
    if (flags.hasGoal) score += 25;
    if (flags.hasContext) score += 25;
    if (flags.hasInstructions) score += 25;
    if (flags.hasOutputFormat) score += 25;
    return score;
  }

  return {
    evaluate,
  };
})();
