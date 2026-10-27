import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { debeMostrarIntro, IntroAnimacion } from './components/IntroAnimacion'
import { ConfigPage } from './config/ConfigPage'
import { useConfiguracion } from './config/useConfiguracion'
import { InformePage } from './informe/InformePage'
import { PresentacionPage } from './presentacion/PresentacionPage'
import './index.css'

// Ruteo mínimo: /config es la pantalla privada de configuración, /informe muestra INFORME.md y /presentacion
// es la presentación del trabajo; todo lo demás es la app.
const ruta = window.location.pathname.replace(/\/+$/, '')
const pantalla =
  ruta === '/config' ? <ConfigPage /> : ruta === '/informe' ? <InformePage /> : ruta === '/presentacion' ? <PresentacionPage /> : <AppConIntro />

// La app muestra primero la animación de entrada (una vez por sesión).
function AppConIntro() {
  const { config } = useConfiguracion()
  const [intro, setIntro] = useState(() => config.introAnimada && debeMostrarIntro())
  return (
    <>
      <App />
      {intro && <IntroAnimacion onTerminar={() => setIntro(false)} />}
    </>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode>{pantalla}</StrictMode>)
