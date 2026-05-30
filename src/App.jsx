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

  // --- Tema y navegación ---
  const [tema, setTema] = useState(
    () => (typeof localStorage !== 'undefined' && localStorage.getItem('tema')) || 'light'
  )
  // Pestaña principal: 'inicio' (portada + ejemplos + cómo funciona) o 'servicios' (las herramientas)
  const [vista, setVista] = useState('inicio')

  function irAServicios(modoDestino) {
    if (modoDestino) setModo(modoDestino)
    setVista('servicios')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function irAVista(v) {
    setVista(v)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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

  async function onProbarEjemplo() {
    setModo('analizar')
    setVista('servicios')
    setTexto(CONTRATO_EJEMPLO)
    setError('')
    setErrorArchivo('')
    setContratoMejorado('')
    setResultado(null)
    setCargando(true)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    try {
      const data = await analizarContrato(CONTRATO_EJEMPLO)
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
        <nav className="mainnav no-print">
            <button
              className={`mainnav-btn ${vista === 'inicio' ? 'activo' : ''}`}
              onClick={() => irAVista('inicio')}
            >
              Inicio
            </button>
            <button
              className={`mainnav-btn ${vista === 'servicios' ? 'activo' : ''}`}
              onClick={() => irAServicios()}
            >
              Servicios
            </button>
            <button
              className={`mainnav-btn ${vista === 'cobrar' ? 'activo' : ''}`}
              onClick={() => irAVista('cobrar')}
            >
              Calcular precio
            </button>
            <button
              className={`mainnav-btn ${vista === 'contacto' ? 'activo' : ''}`}
              onClick={() => irAVista('contacto')}
            >
              Contacto
            </button>
        </nav>
        <div className="topbar-right no-print">
          <button
            className="icon-btn icon-btn--solo"
            onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')}
            title="Cambiar entre claro y oscuro"
            aria-label="Cambiar entre modo claro y oscuro"
          >
            {tema === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* ===================== INICIO (portada + ejemplos + cómo funciona) ===================== */}
      {vista === 'inicio' && (
        <Inicio onProbarEjemplo={onProbarEjemplo} onIrServicios={irAServicios} />
      )}

      <main className="container" hidden={vista !== 'servicios'}>
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

      {/* ===================== CALCULAR PRECIO ===================== */}
      {vista === 'cobrar' && (
        <main className="container">
          <Calculadora />
        </main>
      )}

      {/* ===================== CONTACTO ===================== */}
      {vista === 'contacto' && (
        <main className="container">
          <Contacto />
        </main>
      )}

      <footer className="footer no-print">
        <p>MILEXLEGAL · Hackathon Claude para abogados · 2026</p>
      </footer>
    </div>
  )
}

function Inicio({ onProbarEjemplo, onIrServicios }) {
  const features = [
    ['🚦', 'Nivel de riesgo', 'Un semáforo y puntaje de 0 a 100 sobre qué tan seguro es firmar.'],
    ['🔴', 'Cláusulas riesgosas', 'Cada cláusula problemática explicada en español simple.'],
    ['❓', 'Qué preguntar', 'Las preguntas clave que debes hacer antes de firmar.'],
    ['⚖️', 'Jurisprudencia', 'Tesis y referencias legales relacionadas para profundizar.'],
    ['✍️', 'Contrato mejorado', 'Una versión justa y equilibrada, lista para Word.'],
    ['🎤', 'Crea por voz', 'Dicta lo que necesitas y la IA redacta un contrato nuevo.'],
  ]

  return (
    <main className="container inicio">
      {/* ---- Portada que vende ---- */}
      <section className="landing">
        <div className="landing-text">
          <h1>
            Antes de firmar, <span className="hl">entiende lo que firmas</span>.
          </h1>
          <p className="hero-sub">
            El auxiliar jurídico con IA que hace el primer barrido de cualquier contrato en segundos:
            detecta cláusulas riesgosas, qué preguntar y cómo mejorarlo, para que el abogado decida
            con todo sobre la mesa.
          </p>
          <div className="hero-trust">
            <span>✓ En segundos</span>
            <span>✓ PDF y Word</span>
            <span>✓ En español simple</span>
          </div>
        </div>

        <div className="landing-visual" aria-hidden="true">
          <div className="mock-stack">
            <div className="mock-doc">
              <span className="doc-tag">CONTRATO</span>
              <span className="doc-line w85" />
              <span className="doc-line" />
              <span className="doc-line w60" />
              <span className="doc-line" />
              <span className="doc-line w75" />
              <span className="doc-line w50" />
              <span className="doc-stamp">⚠️ RIESGO ALTO</span>
            </div>
            <div className="mock-card">
              <div className="mock-gauge">
                <div className="mock-emoji">🔴</div>
                <div className="mock-score">
                  78<span>/100</span>
                </div>
                <div className="mock-label">Riesgo alto al firmar</div>
              </div>
              <div className="mock-clause">
                <span className="mock-badge">🔴 Riesgo alto</span>
                <strong>Depósito no reembolsable</strong>
                <p>Pierdes tu depósito aunque entregues el inmueble en buen estado.</p>
              </div>
              <div className="mock-chip">✍️ Contrato mejorado listo en Word</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Qué ofrecemos: 2 servicios principales, en forma de imagen ---- */}
      <section className="servicios-destacados">
        <div className="show-head">
          <h2>Esto es lo que hacemos por ti</h2>
          <p className="show-sub">
            Dos formas de ayudarte con tus contratos. Elige la que necesitas hoy.
          </p>
        </div>

        <div className="serv-cards">
          {/* Servicio 1: Analizar */}
          <article className="serv-card">
            <div className="serv-visual serv-visual--analizar" aria-hidden="true">
              <div className="serv-doc">
                <span className="serv-doc-line" />
                <span className="serv-doc-line short" />
                <span className="serv-doc-line" />
                <span className="serv-doc-line short" />
                <span className="serv-doc-flag">🔴 Cláusula riesgosa</span>
              </div>
              <div className="serv-lupa">🔍</div>
            </div>
            <div className="serv-body">
              <span className="serv-tag">Servicio 01</span>
              <h3>Analizamos tu contrato</h3>
              <p>
                Sube un contrato en PDF, Word o texto y la IA lo revisa cláusula por cláusula:
                detecta riesgos, te dice qué preguntar y te da una versión mejorada.
              </p>
              <button className="btn primary" onClick={() => onIrServicios('analizar')}>
                🔍 Analizar un contrato
              </button>
            </div>
          </article>

          {/* Servicio 2: Crear */}
          <article className="serv-card">
            <div className="serv-visual serv-visual--crear" aria-hidden="true">
              <div className="serv-doc">
                <span className="serv-doc-line" />
                <span className="serv-doc-line" />
                <span className="serv-doc-line short" />
                <span className="serv-doc-cursor" />
              </div>
              <div className="serv-mic">🎤</div>
            </div>
            <div className="serv-body">
              <span className="serv-tag">Servicio 02</span>
              <h3>Creamos tu contrato</h3>
              <p>
                Describe (escribiendo o por voz) el contrato que necesitas y la IA lo redacta
                completo, listo para descargar en Word y editar.
              </p>
              <button className="btn primary" onClick={() => onIrServicios('crear')}>
                ✍️ Crear un contrato
              </button>
            </div>
          </article>
        </div>
      </section>

      {/* ---- Números ---- */}
      <section className="stats">
        <div className="stat">
          <div className="stat-num">6</div>
          <div className="stat-label">revisiones en un solo análisis</div>
        </div>
        <div className="stat">
          <div className="stat-num">3</div>
          <div className="stat-label">formatos que lee: PDF, Word y texto</div>
        </div>
        <div className="stat">
          <div className="stat-num">2</div>
          <div className="stat-label">formas de exportar: PDF y Word</div>
        </div>
      </section>

      {/* ---- Ejemplos de lo que hacemos ---- */}
      <section className="showcase">
        <div className="show-head">
          <h2>Ejemplos de lo que hacemos</h2>
          <p className="show-sub">
            La IA hace el primer barrido del contrato en segundos, para que el abogado dedique su
            tiempo al criterio legal. La última palabra siempre es tuya.
          </p>
        </div>
        <div className="guia-grid">
          {features.map(([e, t, d], i) => (
            <div key={i} className="guia-feature">
              <span className="emoji">{e}</span>
              <span>
                <strong>{t}</strong>
                {d}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Cómo funciona ---- */}
      <section className="showcase">
        <h2 className="show-pasos-title">Cómo funciona, en 3 pasos</h2>
        <div className="pasos">
          <div className="paso card">
            <div className="paso-num">1</div>
            <h3>Sube o pega</h3>
            <p>Tu contrato en PDF, Word o texto — o descríbelo por voz para crear uno nuevo.</p>
          </div>
          <div className="paso card">
            <div className="paso-num">2</div>
            <h3>La IA trabaja</h3>
            <p>Analiza cada cláusula y detecta riesgos, o redacta un contrato a tu medida.</p>
          </div>
          <div className="paso card">
            <div className="paso-num">3</div>
            <h3>Descarga</h3>
            <p>Reporte en PDF, y contratos mejorados o nuevos en Word, listos para usar.</p>
          </div>
        </div>
      </section>

      {/* ---- Para qué sirve ---- */}
      <section className="guia-bloque card problema">
        <h2>🎯 Un auxiliar para el abogado, no un reemplazo</h2>
        <p>
          Revisar cada contrato cláusula por cláusula consume horas valiosas del despacho.{' '}
          <strong>MILEXLEGAL es tu auxiliar jurídico con IA:</strong> hace el primer barrido en
          segundos —detecta riesgos, los resume y propone mejoras— para que tú, el abogado, dediques
          tu tiempo al criterio legal, la estrategia y tus clientes. La herramienta apoya tu trabajo;
          el juicio profesional y la decisión final siempre son tuyos.
        </p>
      </section>

      {/* ---- Cierre ---- */}
      <section className="show-cierre">
        <button className="btn primary grande" onClick={onProbarEjemplo}>
          ▶️ Probar ahora con un ejemplo
        </button>
        <button className="btn ghost grande" onClick={() => window.print()}>
          📄 Descargar esta guía (PDF)
        </button>
      </section>

      <p className="disclaimer" style={{ textAlign: 'center' }}>
        MILEXLEGAL ofrece orientación informativa generada por IA y no sustituye la asesoría de un
        abogado.
      </p>
    </main>
  )
}

// ---------- Contacto ----------
function Contacto() {
  const [enviado, setEnviado] = useState(false)

  function onEnviar(e) {
    e.preventDefault()
    const datos = new FormData(e.target)
    const nombre = encodeURIComponent(datos.get('nombre') || '')
    const mensaje = encodeURIComponent(datos.get('mensaje') || '')
    const correo = encodeURIComponent(datos.get('correo') || '')
    window.location.href = `mailto:contacto@milexlegal.com?subject=Consulta de ${nombre}&body=${mensaje}%0D%0A%0D%0AResponder a: ${correo}`
    setEnviado(true)
  }

  const canales = [
    ['✉️', 'Correo', 'contacto@milexlegal.com', 'mailto:contacto@milexlegal.com'],
    ['💬', 'WhatsApp', '+52 55 1234 5678', 'https://wa.me/525512345678'],
    ['📞', 'Teléfono', '+52 55 1234 5678', 'tel:+525512345678'],
    ['📍', 'Oficina', 'Ciudad de México, México', null],
  ]

  return (
    <>
      <section className="hero">
        <h1>
          Hablemos de tu <span className="hl">tranquilidad legal</span>.
        </h1>
        <p className="hero-sub">
          ¿Tienes un contrato delicado o necesitas asesoría personalizada? Escríbenos y un especialista
          de MILEXLEGAL te responderá a la brevedad.
        </p>
      </section>

      <div className="contacto">
        <div className="contacto-canales">
          {canales.map(([emoji, titulo, valor, link], i) => (
            <div key={i} className="contacto-card card">
              <span className="contacto-emoji">{emoji}</span>
              <div>
                <strong>{titulo}</strong>
                {link ? (
                  <a href={link} target="_blank" rel="noreferrer">
                    {valor}
                  </a>
                ) : (
                  <span>{valor}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <form className="contacto-form card" onSubmit={onEnviar}>
          <h2>Envíanos un mensaje</h2>
          <label>
            Nombre
            <input name="nombre" type="text" placeholder="Tu nombre" required />
          </label>
          <label>
            Correo
            <input name="correo" type="email" placeholder="tucorreo@ejemplo.com" required />
          </label>
          <label>
            Mensaje
            <textarea name="mensaje" rows="5" placeholder="Cuéntanos cómo podemos ayudarte…" required />
          </label>
          <button className="btn primary" type="submit">
            Enviar mensaje
          </button>
          {enviado && (
            <p className="contacto-ok">✓ ¡Gracias! Se abrió tu correo para enviar el mensaje.</p>
          )}
        </form>
      </div>

      <p className="disclaimer" style={{ textAlign: 'center' }}>
        MILEXLEGAL ofrece orientación informativa generada por IA y no sustituye la asesoría de un
        abogado.
      </p>
    </>
  )
}

// ---------- Calculadora de precio ----------
const TIPOS = [
  { id: 'sencillo', nombre: 'Sencillo', ejemplo: 'Carta responsiva, recibo, pagaré simple', base: 700 },
  { id: 'estandar', nombre: 'Estándar', ejemplo: 'Arrendamiento, prestación de servicios, compraventa simple', base: 1800 },
  { id: 'complejo', nombre: 'Complejo', ejemplo: 'Laboral, sociedad, distribución, confidencialidad', base: 3800 },
  { id: 'corporativo', nombre: 'Corporativo', ejemplo: 'Alta especialización, fusiones, contratos internacionales', base: 7500 },
]

const SERVICIOS = [
  { id: 'analisis', emoji: '🔍', nombre: 'Análisis de riesgos cláusula por cláusula', precio: 600 },
  { id: 'mejorado', emoji: '✍️', nombre: 'Redacción profesional / contrato mejorado', precio: 1200 },
  { id: 'juris', emoji: '⚖️', nombre: 'Investigación de jurisprudencia y tesis', precio: 900 },
  { id: 'preguntas', emoji: '❓', nombre: 'Asesoría: preguntas clave antes de firmar', precio: 500 },
  { id: 'faltantes', emoji: '🛡️', nombre: 'Detección de cláusulas faltantes y protecciones', precio: 450 },
  { id: 'entrega', emoji: '📄', nombre: 'Entrega en PDF y Word editable', precio: 300 },
  { id: 'bilingue', emoji: '🌐', nombre: 'Versión bilingüe (español / inglés)', precio: 1500 },
]

const URGENCIAS = [
  { id: 'normal', nombre: 'Normal (5–7 días)', factor: 1 },
  { id: 'rapida', nombre: 'Rápida (48–72 h)', factor: 1.25 },
  { id: 'urgente', nombre: 'Urgente (24 h)', factor: 1.5 },
]

const CLIENTES = [
  { id: 'fisica', nombre: 'Persona física', factor: 1 },
  { id: 'pyme', nombre: 'Empresa / PyME', factor: 1.15 },
  { id: 'corporativo', nombre: 'Corporativo grande', factor: 1.35 },
]

const PAGINAS_INCLUIDAS = 5
const PRECIO_PAGINA_EXTRA = 120
const REVISIONES_INCLUIDAS = 1
const PRECIO_REVISION_EXTRA = 350

function pesos(n) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

function Calculadora() {
  const [tipoId, setTipoId] = useState('estandar')
  const [servicios, setServicios] = useState(() => new Set(['analisis', 'mejorado', 'entrega']))
  const [paginas, setPaginas] = useState(5)
  const [revisiones, setRevisiones] = useState(1)
  const [urgenciaId, setUrgenciaId] = useState('normal')
  const [clienteId, setClienteId] = useState('fisica')

  const tipo = TIPOS.find((t) => t.id === tipoId)
  const urgencia = URGENCIAS.find((u) => u.id === urgenciaId)
  const cliente = CLIENTES.find((c) => c.id === clienteId)

  const serviciosSel = SERVICIOS.filter((s) => servicios.has(s.id))
  const totalServicios = serviciosSel.reduce((a, s) => a + s.precio, 0)

  const paginasExtra = Math.max(0, paginas - PAGINAS_INCLUIDAS)
  const costoPaginas = paginasExtra * PRECIO_PAGINA_EXTRA

  const revisionesExtra = Math.max(0, revisiones - REVISIONES_INCLUIDAS)
  const costoRevisiones = revisionesExtra * PRECIO_REVISION_EXTRA

  const subtotal = tipo.base + totalServicios + costoPaginas + costoRevisiones
  const total = Math.round((subtotal * urgencia.factor * cliente.factor) / 10) * 10
  const rangoBajo = Math.round((total * 0.9) / 10) * 10
  const rangoAlto = Math.round((total * 1.1) / 10) * 10

  function toggleServicio(id) {
    setServicios((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function descargarCotizacion() {
    const lineas = [
      'MILEXLEGAL — Cotización de elaboración de contrato',
      '',
      `Tipo de contrato: ${tipo.nombre} (${tipo.ejemplo})`,
      `Precio base: ${pesos(tipo.base)}`,
      '',
      'Servicios incluidos:',
      ...(serviciosSel.length
        ? serviciosSel.map((s) => `  • ${s.nombre} — ${pesos(s.precio)}`)
        : ['  • (ninguno seleccionado)']),
      '',
      `Páginas del contrato: ${paginas} (${PAGINAS_INCLUIDAS} incluidas, ${paginasExtra} extra) — ${pesos(costoPaginas)}`,
      `Rondas de revisión: ${revisiones} (${REVISIONES_INCLUIDAS} incluida, ${revisionesExtra} extra) — ${pesos(costoRevisiones)}`,
      '',
      `Subtotal: ${pesos(subtotal)}`,
      `Urgencia: ${urgencia.nombre} (x${urgencia.factor})`,
      `Tipo de cliente: ${cliente.nombre} (x${cliente.factor})`,
      '',
      `TOTAL SUGERIDO: ${pesos(total)}`,
      `Rango sugerido: ${pesos(rangoBajo)} – ${pesos(rangoAlto)}`,
      '',
      'Cotización generada con MILEXLEGAL. Precios de referencia; ajusta según tu criterio profesional.',
    ]
    descargarWord(lineas.join('\n'), 'cotizacion-milexlegal.doc')
  }

  return (
    <>
      <section className="hero">
        <h1>
          ¿Cuánto cobrar por <span className="hl">elaborar un contrato</span>?
        </h1>
        <p className="hero-sub">
          Arma tu cotización: elige el tipo de contrato, marca los servicios que ofreces y ajusta la
          urgencia y el cliente. La calculadora te sugiere un precio justo en pesos.
        </p>
      </section>

      <div className="calc">
        <div className="calc-form">
          <section className="card calc-bloque">
            <h2>1. Tipo de contrato</h2>
            <div className="calc-opciones">
              {TIPOS.map((t) => (
                <button
                  key={t.id}
                  className={`calc-op ${tipoId === t.id ? 'activo' : ''}`}
                  onClick={() => setTipoId(t.id)}
                >
                  <div className="calc-op-top">
                    <strong>{t.nombre}</strong>
                    <span className="calc-precio">{pesos(t.base)}</span>
                  </div>
                  <span className="calc-op-ej">{t.ejemplo}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="card calc-bloque">
            <h2>2. Servicios que incluyes</h2>
            <div className="calc-servicios">
              {SERVICIOS.map((s) => (
                <label key={s.id} className={`calc-check ${servicios.has(s.id) ? 'activo' : ''}`}>
                  <input
                    type="checkbox"
                    checked={servicios.has(s.id)}
                    onChange={() => toggleServicio(s.id)}
                  />
                  <span className="calc-check-txt">
                    {s.emoji} {s.nombre}
                  </span>
                  <span className="calc-precio">+{pesos(s.precio)}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="card calc-bloque">
            <h2>3. Tamaño y revisiones</h2>
            <div className="calc-numeros">
              <div className="calc-num">
                <label>
                  Páginas del contrato
                  <small>{PAGINAS_INCLUIDAS} incluidas · luego +{pesos(PRECIO_PAGINA_EXTRA)} c/u</small>
                </label>
                <div className="stepper">
                  <button onClick={() => setPaginas((p) => Math.max(1, p - 1))}>−</button>
                  <span>{paginas}</span>
                  <button onClick={() => setPaginas((p) => p + 1)}>+</button>
                </div>
              </div>
              <div className="calc-num">
                <label>
                  Rondas de revisión
                  <small>{REVISIONES_INCLUIDAS} incluida · luego +{pesos(PRECIO_REVISION_EXTRA)} c/u</small>
                </label>
                <div className="stepper">
                  <button onClick={() => setRevisiones((r) => Math.max(0, r - 1))}>−</button>
                  <span>{revisiones}</span>
                  <button onClick={() => setRevisiones((r) => r + 1)}>+</button>
                </div>
              </div>
            </div>
          </section>

          <section className="card calc-bloque">
            <h2>4. Urgencia y cliente</h2>
            <div className="calc-doble">
              <div>
                <p className="calc-sub">Urgencia</p>
                <div className="calc-pills">
                  {URGENCIAS.map((u) => (
                    <button
                      key={u.id}
                      className={`calc-pill ${urgenciaId === u.id ? 'activo' : ''}`}
                      onClick={() => setUrgenciaId(u.id)}
                    >
                      {u.nombre}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="calc-sub">Tipo de cliente</p>
                <div className="calc-pills">
                  {CLIENTES.map((c) => (
                    <button
                      key={c.id}
                      className={`calc-pill ${clienteId === c.id ? 'activo' : ''}`}
                      onClick={() => setClienteId(c.id)}
                    >
                      {c.nombre}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="calc-total card">
          <h2>Tu cotización</h2>
          <ul className="calc-desglose">
            <li>
              <span>Base ({tipo.nombre})</span>
              <span>{pesos(tipo.base)}</span>
            </li>
            <li>
              <span>Servicios ({serviciosSel.length})</span>
              <span>{pesos(totalServicios)}</span>
            </li>
            {costoPaginas > 0 && (
              <li>
                <span>{paginasExtra} página(s) extra</span>
                <span>{pesos(costoPaginas)}</span>
              </li>
            )}
            {costoRevisiones > 0 && (
              <li>
                <span>{revisionesExtra} revisión(es) extra</span>
                <span>{pesos(costoRevisiones)}</span>
              </li>
            )}
            <li className="calc-subtotal">
              <span>Subtotal</span>
              <span>{pesos(subtotal)}</span>
            </li>
            {urgencia.factor !== 1 && (
              <li className="calc-mult">
                <span>Urgencia ({urgencia.nombre})</span>
                <span>×{urgencia.factor}</span>
              </li>
            )}
            {cliente.factor !== 1 && (
              <li className="calc-mult">
                <span>Cliente ({cliente.nombre})</span>
                <span>×{cliente.factor}</span>
              </li>
            )}
          </ul>

          <div className="calc-grandtotal">
            <span>Total sugerido</span>
            <strong>{pesos(total)}</strong>
          </div>
          <p className="calc-rango">
            Rango razonable: <strong>{pesos(rangoBajo)}</strong> – <strong>{pesos(rangoAlto)}</strong>
          </p>

          <button className="btn primary" onClick={descargarCotizacion}>
            ⬇️ Descargar cotización (Word)
          </button>
          <p className="disclaimer">
            Precios de referencia generados por la calculadora. Ajústalos según tu experiencia, plaza
            y el caso concreto.
          </p>
        </aside>
      </div>
    </>
  )
}

export default App
