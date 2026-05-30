import { useState, useEffect, useRef } from 'react'
import './App.css'
import { analizarContrato, generarContratoMejorado, crearContratoNuevo } from './lib/gemini'
import { extraerTextoArchivo } from './lib/leerArchivo'
import { CONTRATO_EJEMPLO } from './sampleContract'

const NIVEL_INFO = {
  alto: { etiqueta: 'Riesgo alto', color: 'rojo', emoji: '🔴' },
  medio: { etiqueta: 'Riesgo medio', color: 'amarillo', emoji: '🟡' },
  bajo: { etiqueta: 'Riesgo bajo', color: 'verde', emoji: '🟢' },
}

function escaparHtml(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Genera y descarga un archivo .doc (lo abre Word) a partir de texto plano.
function descargarWord(texto, nombre = 'contrato.doc') {
  const cuerpo = texto
    .split('\n')
    .map((linea) => (linea.trim() ? `<p>${escaparHtml(linea)}</p>` : '<p>&nbsp;</p>'))
    .join('')

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Contrato</title></head>
<body style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;">${cuerpo}</body>
</html>`

  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function App() {
  const [modo, setModo] = useState('analizar')

  // --- Analizar ---
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [errorArchivo, setErrorArchivo] = useState('')
  const fileRef = useRef(null)

  const [mejorando, setMejorando] = useState(false)
  const [contratoMejorado, setContratoMejorado] = useState('')
  const [errorMejora, setErrorMejora] = useState('')

  // --- Crear ---
  const [descripcion, setDescripcion] = useState('')
  const [creando, setCreando] = useState(false)
  const [contratoNuevo, setContratoNuevo] = useState('')
  const [errorNuevo, setErrorNuevo] = useState('')
  const [escuchando, setEscuchando] = useState(false)
  const recRef = useRef(null)
  const baseVozRef = useRef('')

  // --- Tema y guía ---
  const [tema, setTema] = useState(
    () => (typeof localStorage !== 'undefined' && localStorage.getItem('tema')) || 'light'
  )
  const [vistaGuia, setVistaGuia] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    try {
      localStorage.setItem('tema', tema)
    } catch {
      // sin persistencia
    }
  }, [tema])

  async function onAnalizar() {
    if (!texto.trim()) {
      setError('Pega un contrato, sube un archivo o usa el ejemplo.')
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

  async function onArchivo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrorArchivo('')
    setSubiendo(true)
    setResultado(null)
    try {
      const t = await extraerTextoArchivo(file)
      setTexto(t)
    } catch (err) {
      setErrorArchivo(err.message || 'No se pudo leer el archivo.')
    } finally {
      setSubiendo(false)
      e.target.value = ''
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

  async function onCrear() {
    if (escuchando) recRef.current?.stop()
    if (!descripcion.trim()) {
      setErrorNuevo('Describe (o dicta) qué contrato necesitas.')
      return
    }
    setErrorNuevo('')
    setContratoNuevo('')
    setCreando(true)
    try {
      const c = await crearContratoNuevo(descripcion)
      setContratoNuevo(c)
    } catch (e) {
      setErrorNuevo(e.message || 'No se pudo crear el contrato.')
    } finally {
      setCreando(false)
    }
  }

  function toggleDictado() {
    if (escuchando) {
      recRef.current?.stop()
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setErrorNuevo('Tu navegador no soporta dictado. Usa Chrome o Edge, o escribe la descripción.')
      return
    }
    const rec = new SR()
    rec.lang = 'es-MX'
    rec.interimResults = true
    rec.continuous = true
    baseVozRef.current = descripcion ? descripcion + ' ' : ''
    rec.onresult = (ev) => {
      let finalTxt = ''
      let interim = ''
      for (let i = 0; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) finalTxt += r[0].transcript + ' '
        else interim += r[0].transcript
      }
      setDescripcion((baseVozRef.current + finalTxt + interim).trimStart())
    }
    rec.onend = () => setEscuchando(false)
    rec.onerror = () => setEscuchando(false)
    recRef.current = rec
    setEscuchando(true)
    setErrorNuevo('')
    rec.start()
  }

  function onEjemplo() {
    setTexto(CONTRATO_EJEMPLO)
    setError('')
    setResultado(null)
    setContratoMejorado('')
    setErrorArchivo('')
  }

  function onLimpiar() {
    setTexto('')
    setError('')
    setResultado(null)
    setContratoMejorado('')
    setErrorMejora('')
    setErrorArchivo('')
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
        <div className="topbar-right no-print">
          <span className="brand-tag">Tu auxiliar jurídico con IA</span>
          <button className="icon-btn" onClick={() => setVistaGuia((v) => !v)}>
            {vistaGuia ? '← Volver' : '📘 ¿Cómo funciona?'}
          </button>
          <button
            className="icon-btn"
            onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')}
            title="Cambiar entre claro y oscuro"
          >
            {tema === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
          </button>
        </div>
      </header>

      {vistaGuia && <Guia onEmpezar={() => setVistaGuia(false)} />}

      <main className="container" hidden={vistaGuia}>
        <div className="segmented no-print">
          <button
            className={`seg-btn ${modo === 'analizar' ? 'activo' : ''}`}
            onClick={() => setModo('analizar')}
          >
            🔍 Analizar contrato
          </button>
          <button
            className={`seg-btn ${modo === 'crear' ? 'activo' : ''}`}
            onClick={() => setModo('crear')}
          >
            🆕 Crear contrato
          </button>
        </div>

        {/* ===================== MODO ANALIZAR ===================== */}
        {modo === 'analizar' && (
          <>
            {!resultado && (
              <section className="hero">
                <h1>
                  Antes de firmar, <span className="hl">entiende lo que firmas</span>.
                </h1>
                <p className="hero-sub">
                  Pega o sube tu contrato (PDF, Word o texto) y la inteligencia artificial te dirá,
                  en español sencillo, qué cláusulas son riesgosas, qué preguntar y cómo mejorarlo.
                </p>
              </section>
            )}

            <section className="editor card">
              <div className="editor-head">
                <h2>Tu contrato</h2>
                <div className="editor-actions">
                  <button
                    className="btn ghost"
                    onClick={() => fileRef.current?.click()}
                    disabled={cargando || subiendo}
                  >
                    {subiendo ? 'Leyendo…' : '📎 Subir PDF / Word / Texto'}
                  </button>
                  <button className="btn ghost" onClick={onEjemplo} disabled={cargando}>
                    Cargar ejemplo
                  </button>
                  {texto && (
                    <button className="btn ghost" onClick={onLimpiar} disabled={cargando}>
                      Limpiar
                    </button>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.docx,.txt,application/pdf,text/plain"
                    onChange={onArchivo}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
              {errorArchivo && <p className="error">⚠️ {errorArchivo}</p>}
              <textarea
                className="editor-text"
                placeholder="Pega aquí el texto de tu contrato, o sube un archivo PDF / Word / texto…"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                disabled={cargando}
              />
              <div className="editor-foot">
                <span className="char-count">
                  {texto.length.toLocaleString('es-MX')} caracteres
                </span>
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
                    <div className="gauge-score">
                      {resultado.puntajeRiesgo}
                      <span>/100</span>
                    </div>
                    <div className="gauge-label">{nivelGlobal.etiqueta} al firmar</div>
                  </div>
                  <div className="veredicto-texto">
                    {resultado.tipoContrato && <span className="pill">{resultado.tipoContrato}</span>}
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
                      Esta sección es orientativa y generada por IA. Verifica siempre las citas con
                      un abogado antes de usarlas.
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
                      <button
                        className="btn primary"
                        onClick={() => descargarWord(contratoMejorado, 'contrato-mejorado.doc')}
                      >
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
          </>
        )}

        {/* ===================== MODO CREAR ===================== */}
        {modo === 'crear' && (
          <>
            <section className="hero">
              <h1>
                Crea un contrato <span className="hl">desde cero</span>, con tu voz.
              </h1>
              <p className="hero-sub">
                Describe con tus palabras (escribiendo o por voz) el contrato que necesitas, y la IA
                lo redacta completo y listo para descargar en Word.
              </p>
            </section>

            <section className="editor card">
              <div className="editor-head">
                <h2>¿Qué contrato necesitas?</h2>
                <div className="editor-actions">
                  <button
                    className={`btn mic ${escuchando ? 'activo' : ''}`}
                    onClick={toggleDictado}
                    disabled={creando}
                  >
                    {escuchando ? '⏹️ Detener dictado' : '🎤 Dictar por voz'}
                  </button>
                  {descripcion && !escuchando && (
                    <button
                      className="btn ghost"
                      onClick={() => {
                        setDescripcion('')
                        setContratoNuevo('')
                      }}
                      disabled={creando}
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
              {escuchando && <p className="escuchando-aviso">🔴 Escuchando… habla con claridad.</p>}
              <textarea
                className="editor-text"
                placeholder="Ej: Necesito un contrato de arrendamiento de un departamento por 12 meses, renta de $8,000 al mes, depósito de un mes reembolsable, el inquilino paga luz y agua…"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                disabled={creando}
              />
              <div className="editor-foot">
                <span className="char-count">
                  {descripcion.length.toLocaleString('es-MX')} caracteres
                </span>
                <button className="btn primary" onClick={onCrear} disabled={creando}>
                  {creando ? 'Creando…' : '✨ Crear contrato'}
                </button>
              </div>
              {errorNuevo && <p className="error">⚠️ {errorNuevo}</p>}
            </section>

            {creando && (
              <section className="loading card">
                <div className="spinner" />
                <p>Redactando tu contrato a la medida…</p>
              </section>
            )}

            {contratoNuevo && (
              <div className="mejorado card">
                <div className="mejorado-head">
                  <h2>✨ Tu contrato nuevo</h2>
                  <button
                    className="btn primary"
                    onClick={() => descargarWord(contratoNuevo, 'contrato-nuevo.doc')}
                  >
                    ⬇️ Descargar en Word
                  </button>
                </div>
                <pre className="mejorado-texto">{contratoNuevo}</pre>
                <p className="disclaimer">
                  Documento generado por IA con fines informativos. Revísalo con un abogado antes de
                  usarlo.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="footer no-print">
        <p>MILEXLEGAL · Hackathon Claude para abogados · 2026</p>
      </footer>
    </div>
  )
}

function Guia({ onEmpezar }) {
  const features = [
    ['📎', 'Sube PDF, Word o texto', 'Carga el contrato como archivo o pégalo; la app extrae el texto sola.'],
    ['🚦', 'Nivel de riesgo al firmar', 'Un semáforo y un puntaje de 0 a 100 que te dice qué tan riesgoso es firmar.'],
    ['🔴', 'Cláusulas riesgosas explicadas', 'Cada cláusula problemática, en español simple, y qué hacer al respecto.'],
    ['❓', 'Preguntas antes de firmar', 'Las preguntas clave que deberías hacer antes de poner tu firma.'],
    ['⚖️', 'Tesis y jurisprudencia', 'Temas legales y referencias relacionadas, orientativas, para profundizar.'],
    ['🎤', 'Crea contratos por voz', 'Dictas o describes lo que necesitas y la IA redacta un contrato nuevo.'],
    ['📄', 'Reporte en PDF', 'Descarga todo el análisis en un PDF para guardarlo o compartirlo.'],
    ['✍️', 'Contratos en Word', 'Versiones mejoradas o nuevas, listas para descargar y editar en Word.'],
  ]

  return (
    <main className="container guia">
      <div className="guia-hero">
        <img className="guia-logo" src="/justicia.png" alt="MILEXLEGAL" />
        <span className="guia-marca">MILEXLEGAL</span>
        <h1>Revisa tu Contrato</h1>
        <p className="guia-lead">
          Tu auxiliar jurídico con inteligencia artificial. Entiende cualquier contrato antes de
          firmarlo, descubre sus riesgos y crea contratos nuevos — en segundos, sin necesidad de ser
          abogado.
        </p>
      </div>

      <div className="guia-bloque card">
        <h2>🎯 El problema que resolvemos</h2>
        <p style={{ lineHeight: 1.6, color: 'var(--ink)' }}>
          Millones de personas firman contratos de renta, trabajo o servicios que no entienden, y
          aceptan cláusulas abusivas sin darse cuenta. Pagar un abogado para revisar cada documento
          es caro y lento. <strong>MILEXLEGAL democratiza la revisión legal:</strong> pones tu
          contrato y, en segundos, sabes a qué te estás comprometiendo.
        </p>
      </div>

      <div className="guia-bloque">
        <h2>⚙️ Cómo funciona en 3 pasos</h2>
        <div className="pasos">
          <div className="paso card">
            <div className="paso-num">1</div>
            <h3>Sube o pega</h3>
            <p>Carga tu contrato en PDF, Word o texto — o descríbelo por voz para crear uno nuevo.</p>
          </div>
          <div className="paso card">
            <div className="paso-num">2</div>
            <h3>La IA trabaja</h3>
            <p>Analiza cada cláusula y detecta riesgos, o redacta un contrato completo a tu medida.</p>
          </div>
          <div className="paso card">
            <div className="paso-num">3</div>
            <h3>Descarga</h3>
            <p>Reporte en PDF, y contratos mejorados o nuevos en Word, listos para usar.</p>
          </div>
        </div>
      </div>

      <div className="guia-bloque">
        <h2>✨ Qué obtienes</h2>
        <div className="guia-grid">
          {features.map(([emoji, titulo, desc], i) => (
            <div key={i} className="guia-feature">
              <span className="emoji">{emoji}</span>
              <span>
                <strong>{titulo}</strong>
                {desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="guia-cta no-print">
        <button className="btn primary" onClick={onEmpezar}>
          🚀 Empezar a usar la app
        </button>
        <button className="btn ghost" onClick={() => window.print()}>
          📄 Descargar esta guía (PDF)
        </button>
      </div>

      <p className="disclaimer" style={{ textAlign: 'center' }}>
        MILEXLEGAL ofrece orientación informativa generada por IA y no sustituye la asesoría de un
        abogado.
      </p>
    </main>
  )
}

export default App
