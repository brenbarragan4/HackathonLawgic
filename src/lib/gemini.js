// Motor de IA: llama a la API de Gemini para analizar un contrato.
// La llave vive en .env.local como VITE_GEMINI_API_KEY (no se sube a GitHub).

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const MODEL = 'gemini-2.0-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`

// Le decimos a Gemini exactamente qué forma debe tener su respuesta (JSON),
// así la app la puede leer sin fallar.
const responseSchema = {
  type: 'OBJECT',
  properties: {
    resumen: { type: 'STRING' },
    nivelRiesgoGlobal: { type: 'STRING', enum: ['bajo', 'medio', 'alto'] },
    puntajeRiesgo: { type: 'INTEGER' },
    tipoContrato: { type: 'STRING' },
    clausulas: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          titulo: { type: 'STRING' },
          nivel: { type: 'STRING', enum: ['bajo', 'medio', 'alto'] },
          explicacion: { type: 'STRING' },
          recomendacion: { type: 'STRING' },
        },
        required: ['titulo', 'nivel', 'explicacion', 'recomendacion'],
      },
    },
    puntosAFavor: { type: 'ARRAY', items: { type: 'STRING' } },
    clausulasFaltantes: { type: 'ARRAY', items: { type: 'STRING' } },
    preguntasAntesDeFirmar: { type: 'ARRAY', items: { type: 'STRING' } },
    jurisprudencia: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          tema: { type: 'STRING' },
          referencia: { type: 'STRING' },
          relacion: { type: 'STRING' },
        },
        required: ['tema', 'relacion'],
      },
    },
  },
  required: ['resumen', 'nivelRiesgoGlobal', 'puntajeRiesgo', 'clausulas'],
}

const INSTRUCCIONES = `Eres un abogado experto en revisión de contratos en México y Latinoamérica.
Tu trabajo es proteger a una persona común (sin conocimientos legales) que está a punto de firmar un contrato.

Analiza el contrato que te dan y responde SIEMPRE en español sencillo, como si le explicaras a un amigo sin estudios de derecho.

Para cada cláusula riesgosa o abusiva:
- "titulo": nombre corto y claro del problema (ej. "Depósito no reembolsable").
- "nivel": "alto" si puede causar un daño económico o legal grave; "medio" si es desventajoso; "bajo" si es un detalle menor.
- "explicacion": en 1-2 frases simples, QUÉ significa y POR QUÉ es riesgoso para quien firma.
- "recomendacion": qué debería hacer o pedir la persona antes de firmar.

También:
- "resumen": 2-3 frases sobre el contrato en general y su nivel de riesgo.
- "nivelRiesgoGlobal": "bajo" / "medio" / "alto".
- "puntajeRiesgo": número de 0 (sin riesgo) a 100 (muy peligroso).
- "tipoContrato": qué tipo de contrato es (arrendamiento, laboral, compraventa, etc.).
- "puntosAFavor": cosas que SÍ protegen a quien firma (puede estar vacío).
- "clausulasFaltantes": protecciones importantes que el contrato DEBERÍA tener pero no tiene.
- "preguntasAntesDeFirmar": 4 a 6 preguntas concretas y útiles que la persona DEBERÍA hacer (al arrendador, empleador, vendedor, etc.) antes de firmar este contrato.
- "jurisprudencia": de 2 a 4 elementos con el área del derecho, principios legales o tipos de tesis/jurisprudencia mexicana RELACIONADOS con los riesgos detectados. Para cada uno:
    - "tema": el principio o tema legal (ej. "Cláusulas abusivas en contratos de adhesión").
    - "referencia": si conoces una tesis/jurisprudencia, ley o artículo aplicable, menciónalo de forma general (ej. "Código Civil Federal, arts. 2406-2447" o "Tesis sobre lesión en contratos"). Si NO estás seguro de una cita exacta, deja este campo vacío o pon "Verificar con un abogado". NUNCA inventes números de registro o datos de tesis que no conozcas con certeza.
    - "relacion": en 1-2 frases, cómo se relaciona ese tema con el contrato analizado.

Sé honesto y prudente. La sección de jurisprudencia es ORIENTATIVA y siempre debe verificarse con un abogado. Recuerda que esto es orientación informativa, no asesoría legal formal.`

export async function analizarContrato(textoContrato) {
  if (!API_KEY) {
    throw new Error(
      'No se encontró la llave de Gemini. Revisa que VITE_GEMINI_API_KEY esté en el archivo .env.local y reinicia el servidor.'
    )
  }

  const body = {
    contents: [
      {
        parts: [
          { text: INSTRUCCIONES },
          { text: '\n\n=== CONTRATO A ANALIZAR ===\n\n' + textoContrato },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema,
    },
  }

  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('No se pudo conectar con Gemini. Revisa tu conexión a internet.')
  }

  if (!res.ok) {
    let detalle = ''
    try {
      const err = await res.json()
      detalle = err?.error?.message || ''
    } catch {
      // sin detalle
    }
    throw new Error(
      `Gemini respondió con un error (${res.status}). ${detalle || 'Revisa que tu llave sea válida.'}`
    )
  }

  const data = await res.json()
  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!texto) {
    throw new Error('Gemini no devolvió una respuesta válida. Intenta de nuevo.')
  }

  try {
    return JSON.parse(texto)
  } catch {
    throw new Error('No se pudo leer la respuesta de la IA. Intenta de nuevo.')
  }
}

const INSTRUCCIONES_MEJORA = `Eres un abogado experto en redacción de contratos en México.
Te dan un contrato que puede tener cláusulas abusivas, desventajosas o desequilibradas.

Tu tarea: reescribir el contrato en una versión MEJORADA, JUSTA y EQUILIBRADA para ambas partes, que:
- Corrija o suavice las cláusulas abusivas.
- Proteja a la parte más débil sin perjudicar injustamente a la otra.
- Agregue las cláusulas de protección importantes que falten (depósito reembolsable razonable, condiciones claras de terminación, plazos justos, etc.).
- Use lenguaje claro y profesional.

Devuelve SOLO el texto del contrato mejorado, bien estructurado:
- Un título en la primera línea.
- Cláusulas numeradas con ordinales (PRIMERA., SEGUNDA., TERCERA., ...).
- Espacios para datos con líneas: ____________.
- Al final, líneas para las firmas de ambas partes.

No agregues explicaciones, comentarios ni notas fuera del contrato. Solo el documento listo para usar. En español.`

export async function generarContratoMejorado(textoContrato) {
  if (!API_KEY) {
    throw new Error(
      'No se encontró la llave de Gemini. Revisa que VITE_GEMINI_API_KEY esté en el archivo .env.local y reinicia el servidor.'
    )
  }

  const body = {
    contents: [
      {
        parts: [
          { text: INSTRUCCIONES_MEJORA },
          { text: '\n\n=== CONTRATO ORIGINAL ===\n\n' + textoContrato },
        ],
      },
    ],
    generationConfig: { temperature: 0.4 },
  }

  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('No se pudo conectar con Gemini. Revisa tu conexión a internet.')
  }

  if (!res.ok) {
    let detalle = ''
    try {
      const err = await res.json()
      detalle = err?.error?.message || ''
    } catch {
      // sin detalle
    }
    throw new Error(`Gemini respondió con un error (${res.status}). ${detalle}`)
  }

  const data = await res.json()
  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!texto) {
    throw new Error('Gemini no devolvió un contrato. Intenta de nuevo.')
  }
  return texto.trim()
}

const INSTRUCCIONES_NUEVO = `Eres un abogado experto en redacción de contratos en México.
La persona te describe, con sus palabras, el contrato que necesita. Tu tarea es redactar un
contrato COMPLETO, justo y profesional a partir de esa descripción.

- Identifica el tipo de contrato adecuado según lo que pide.
- Incluye todas las cláusulas necesarias y equilibradas para ambas partes.
- Agrega protecciones estándar (terminación, plazos, pagos, obligaciones, resolución de controversias).
- Donde falten datos concretos, deja espacios para llenar: ____________.

Devuelve SOLO el texto del contrato:
- Título en la primera línea.
- Cláusulas numeradas con ordinales (PRIMERA., SEGUNDA., ...).
- Al final, líneas para las firmas de ambas partes.

No agregues explicaciones ni comentarios fuera del contrato. En español.`

export async function crearContratoNuevo(descripcion) {
  if (!API_KEY) {
    throw new Error(
      'No se encontró la llave de Gemini. Revisa que VITE_GEMINI_API_KEY esté en el archivo .env.local y reinicia el servidor.'
    )
  }

  const body = {
    contents: [
      {
        parts: [
          { text: INSTRUCCIONES_NUEVO },
          { text: '\n\n=== LO QUE NECESITA LA PERSONA ===\n\n' + descripcion },
        ],
      },
    ],
    generationConfig: { temperature: 0.5 },
  }

  let res
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('No se pudo conectar con Gemini. Revisa tu conexión a internet.')
  }

  if (!res.ok) {
    let detalle = ''
    try {
      const err = await res.json()
      detalle = err?.error?.message || ''
    } catch {
      // sin detalle
    }
    throw new Error(`Gemini respondió con un error (${res.status}). ${detalle}`)
  }

  const data = await res.json()
  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!texto) {
    throw new Error('Gemini no devolvió un contrato. Intenta de nuevo.')
  }
  return texto.trim()
}
