// Extrae el texto de un archivo de contrato: PDF, Word (.docx) o texto plano (.txt).
import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

export async function extraerTextoArchivo(file) {
  const nombre = (file.name || '').toLowerCase()

  // Texto plano
  if (nombre.endsWith('.txt') || file.type === 'text/plain') {
    return (await file.text()).trim()
  }

  // Word moderno (.docx)
  if (nombre.endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer()
    const { value } = await mammoth.extractRawText({ arrayBuffer })
    return (value || '').trim()
  }

  // Word viejo (.doc) no es legible de forma confiable en el navegador
  if (nombre.endsWith('.doc')) {
    throw new Error(
      'Los archivos .doc (Word antiguo) no se pueden leer. Guárdalo como .docx o .pdf, o copia y pega el texto.'
    )
  }

  // PDF
  if (nombre.endsWith('.pdf') || file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let texto = ''
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const content = await page.getTextContent()
      texto += content.items.map((it) => it.str).join(' ') + '\n'
    }
    texto = texto.trim()
    if (!texto) {
      throw new Error(
        'No se pudo extraer texto del PDF (puede ser una imagen escaneada). Intenta con un PDF con texto seleccionable.'
      )
    }
    return texto
  }

  throw new Error('Formato no soportado. Usa PDF, Word (.docx) o texto (.txt).')
}
