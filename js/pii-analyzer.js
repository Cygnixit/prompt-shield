// js/pii-analyzer.js
// Motor de detección de PII para Prompt Shield.
// Todo corre en el navegador. No se envían datos a ningún servidor.

window.PIIAnalyzer = (function () {
  /**
   * Analiza el texto y devuelve una lista de posibles PII.
   * options: { paranoid: boolean }
   */
  function analyze(text, options = {}) {
    const paranoid = !!options.paranoid;
    const source = (text || "").toString();

    const findings = [];

    // 1) Emails básicos
    const emailRegex =
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    pushMatches(findings, source, emailRegex, "email");

    // 2) Teléfonos (heurístico simple)
    // Detecta secuencias de 7-15 dígitos con separadores opcionales
    const phoneRegex =
      /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/g;
    pushMatches(findings, source, phoneRegex, "phone");

    // 3) URLs
    const urlRegex = /\bhttps?:\/\/[^\s]+/g;
    pushMatches(findings, source, urlRegex, "url");

    // 4) IDs tipo RFC/CURP-like (simplificado)
    const idLikeRegex = /\b[A-Z0-9]{10,18}\b/g;
    if (paranoid) {
      pushMatches(findings, source, idLikeRegex, "id_like");
    }

    // 5) En modo paranoico, posibles nombres propios muy básicos
    if (paranoid) {
      const nameLikeRegex = /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}\b/g;
      pushMatches(findings, source, nameLikeRegex, "name_like");
    }

    return findings;
  }

  function pushMatches(collection, text, regex, type) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      collection.push({
        type,
        value: match[0],
        index: match.index,
      });
    }
  }

  return {
    analyze,
  };
})();
