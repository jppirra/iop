import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ConfigPage } from './config/ConfigPage'
import { InformePage } from './informe/InformePage'
import { PresentacionPage } from './presentacion/PresentacionPage'
import './index.css'

// Ruteo mínimo: /config es la pantalla privada de configuración, /informe muestra INFORME.md y /presentacion
// es la presentación del trabajo; todo lo demás es la app.
const ruta = window.location.pathname.replace(/\/+$/, '')
const pantalla =
  ruta === '/config' ? <ConfigPage /> : ruta === '/informe' ? <InformePage /> : ruta === '/presentacion' ? <PresentacionPage /> : <App />

createRoot(document.getElementById('root')!).render(<StrictMode>{pantalla}</StrictMode>)
