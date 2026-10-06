import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ConfigPage } from './config/ConfigPage'
import { InformePage } from './informe/InformePage'
import './index.css'

// Ruteo mínimo: /config es la pantalla privada de configuración y /informe muestra INFORME.md; todo lo demás es la app.
const ruta = window.location.pathname.replace(/\/+$/, '')
const pantalla = ruta === '/config' ? <ConfigPage /> : ruta === '/informe' ? <InformePage /> : <App />

createRoot(document.getElementById('root')!).render(<StrictMode>{pantalla}</StrictMode>)
