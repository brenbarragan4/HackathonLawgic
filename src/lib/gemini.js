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

Sé honesto y prudente. Recuerda que esto es orientación informativa, no asesoría legal formal.`

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
