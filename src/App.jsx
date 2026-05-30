import { useState } from 'react'
import './App.css'
import { analizarContrato, generarContratoMejorado } from './lib/gemini'
import { CONTRATO_EJEMPLO } from './sampleContract'

const NIVEL_INFO = {
  alto: { etiqueta: 'Riesgo alto', color: 'rojo', emoji: '🔴' },
  medio: { etiqueta: 'Riesgo medio', color: 'amarillo', emoji: '🟡' },
  bajo: { etiqueta: 'Riesgo bajo', color: 'verde', emoji: '🟢' },
}

function escaparHtml(t) {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// Genera y descarga un archivo .doc (lo abre Word) a partir de texto plano.
function descargarWord(texto) {
  const cuerpo = texto
    .split('\n')
    .map((linea) =>
      linea.trim() ? `<p>${escaparHtml(linea)}</p>` : '<p>&nbsp;</p>'
    )
    .join('')

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Contrato mejorado</title></head>
<body style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;">${cuerpo}</body>
</html>`

  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'contrato-mejorado.doc'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function App() {
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)

  const [mejorando, setMejorando] = useState(false)
  const [contratoMejorado, setContratoMejorado] = useState('')
  const [errorMejora, setErrorMejora] = useState('')

  async function onAnalizar() {
    if (!texto.trim()) {
      setError('Pega primero el texto de un contrato (o usa el ejemplo).')
      return
    }
    setError('')
    setResultado(null)
    setContratoMejorado('')
    setErrorMejora('')
    setCargando(true)
    try {
      const data = await analizarContrato(texto)
      setResultado(data)
    } catch (e) {
      setError(e.message || 'Ocurrió un error al analizar.')
    } finally {
      setCargando(false)
    }
  }

  async function onMejorar() {
    setErrorMejora('')
    setContratoMejorado('')
    setMejorando(true)
    try {
      const mejorado = await generarContratoMejorado(texto)
      setContratoMejorado(mejorado)
    } catch (e) {
      setErrorMejora(e.message || 'No se pudo generar el contrato mejorado.')
    } finally {
      setMejorando(false)
    }
  }

  function onEjemplo() {
    setTexto(CONTRATO_EJEMPLO)
    setError('')
    setResultado(null)
    setContratoMejorado('')
  }

  function onLimpiar() {
    setTexto('')
    setError('')
    setResultado(null)
    setContratoMejorado('')
    setErrorMejora('')
  }

  const nivelGlobal = resultado ? NIVEL_INFO[resultado.nivelRiesgoGlobal] || NIVEL_INFO.medio : null

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="brand-mark" src="/justicia.png" alt="MILEXLEGAL" />
          <div>
            <span className="brand-name">Revisa tu Contrato</span>
            <span className="brand-by">MILEXLEGAL</span>
          </div>
        </div>
        <span className="brand-tag">Tu auxiliar jurídico con IA</span>
      </header>

      <main className="container">
        {!resultado && (
          <section className="hero">
            <h1>
              Antes de firmar, <span className="hl">entiende lo que firmas</span>.
            </h1>
            <p className="hero-sub">
              Pega cualquier contrato y la inteligencia artificial te dirá, en español
              sencillo, qué cláusulas son riesgosas, qué preguntar antes de firmar y cómo
              mejorarlo — en segundos.
            </p>
          </section>
        )}

        <section className="editor card">
          <div className="editor-head">
            <h2>Tu contrato</h2>
            <div className="editor-actions">
              <button className="btn ghost" onClick={onEjemplo} disabled={cargando}>
                Cargar ejemplo
              </button>
              {texto && (
                <button className="btn ghost" onClick={onLimpiar} disabled={cargando}>
                  Limpiar
                </button>
              )}
            </div>
          </div>
          <textarea
            className="editor-text"
            placeholder="Pega aquí el texto de tu contrato de arrendamiento, laboral, de servicios, compraventa…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={cargando}
          />
          <div className="editor-foot">
            <span className="char-count">{texto.length.toLocaleString('es-MX')} caracteres</span>
            <button className="btn primary" onClick={onAnalizar} disabled={cargando}>
              {cargando ? 'Analizando…' : '🔍 Analizar contrato'}
            </button>
          </div>
          {error && <p className="error">⚠️ {error}</p>}
        </section>

        {cargando && (
          <section className="loading card">
            <div className="spinner" />
            <p>Leyendo cada cláusula y buscando riesgos…</p>
          </section>
        )}

        {resultado && (
          <section className="resultado" id="reporte">
            <div className={`veredicto card nivel-${nivelGlobal.color}`}>
              <div className="veredicto-gauge">
                <div className="gauge-emoji">{nivelGlobal.emoji}</div>
                <div className="gauge-score">{resultado.puntajeRiesgo}<span>/100</span></div>
                <div className="gauge-label">{nivelGlobal.etiqueta} al firmar</div>
              </div>
              <div className="veredicto-texto">
                {resultado.tipoContrato && (
                  <span className="pill">{resultado.tipoContrato}</span>
                )}
                <h2>Veredicto</h2>
                <p>{resultado.resumen}</p>
              </div>
            </div>

            <div className="seccion-titulo">
              <h2>Cláusulas a revisar</h2>
              <span className="contador">{resultado.clausulas?.length || 0}</span>
            </div>

            <div className="clausulas">
              {resultado.clausulas?.map((c, i) => {
                const info = NIVEL_INFO[c.nivel] || NIVEL_INFO.medio
                return (
                  <article key={i} className={`clausula card nivel-${info.color}`}>
                    <div className="clausula-head">
                      <span className={`badge badge-${info.color}`}>
                        {info.emoji} {info.etiqueta}
                      </span>
                      <h3>{c.titulo}</h3>
                    </div>
                    <p className="clausula-exp">{c.explicacion}</p>
                    <p className="clausula-rec">
                      <strong>💡 Qué hacer:</strong> {c.recomendacion}
                    </p>
                  </article>
                )
              })}
            </div>

            {resultado.preguntasAntesDeFirmar?.length > 0 && (
              <div className="lista-extra card preguntas">
                <h2>❓ Preguntas que deberías hacer antes de firmar</h2>
                <ul>
                  {resultado.preguntasAntesDeFirmar.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {resultado.jurisprudencia?.length > 0 && (
              <div className="lista-extra card juris">
                <h2>⚖️ Tesis y jurisprudencia relacionada</h2>
                <div className="juris-list">
                  {resultado.jurisprudencia.map((j, i) => (
                    <div key={i} className="juris-item">
                      <h4>{j.tema}</h4>
                      {j.referencia && <span className="juris-ref">{j.referencia}</span>}
                      <p>{j.relacion}</p>
                    </div>
                  ))}
                </div>
                <p className="juris-nota">
                  Esta sección es orientativa y generada por IA. Verifica siempre las citas
                  con un abogado antes de usarlas.
                </p>
              </div>
            )}

            {resultado.clausulasFaltantes?.length > 0 && (
              <div className="lista-extra card">
                <h2>🛡️ Protecciones que faltan</h2>
                <ul>
                  {resultado.clausulasFaltantes.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {resultado.puntosAFavor?.length > 0 && (
              <div className="lista-extra card afavor">
                <h2>✅ Puntos a tu favor</h2>
                <ul>
                  {resultado.puntosAFavor.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="acciones-finales no-print">
              <button className="btn primary" onClick={() => window.print()}>
                📄 Descargar análisis (PDF)
              </button>
              <button className="btn verde" onClick={onMejorar} disabled={mejorando}>
                {mejorando ? 'Creando…' : '✍️ Crear contrato mejorado (Word)'}
              </button>
              <button className="btn ghost" onClick={onLimpiar}>
                Analizar otro contrato
              </button>
            </div>

            {errorMejora && <p className="error no-print">⚠️ {errorMejora}</p>}

            {mejorando && (
              <div className="loading card no-print">
                <div className="spinner" />
                <p>Redactando una versión justa y equilibrada de tu contrato…</p>
              </div>
            )}

            {contratoMejorado && (
              <div className="mejorado card no-print">
                <div className="mejorado-head">
                  <h2>✨ Contrato mejorado por IA</h2>
                  <button className="btn primary" onClick={() => descargarWord(contratoMejorado)}>
                    ⬇️ Descargar en Word
                  </button>
                </div>
                <pre className="mejorado-texto">{contratoMejorado}</pre>
              </div>
            )}

            <p className="disclaimer">
              Esta herramienta da orientación informativa generada por IA y no sustituye la
              asesoría de un abogado. Verifica siempre con un profesional antes de firmar.
            </p>
          </section>
        )}
      </main>

      <footer className="footer no-print">
        <p>MILEXLEGAL · Hackathon Claude para abogados · 2026</p>
      </footer>
    </div>
  )
}

export default App
