import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ConfigPage } from './config/ConfigPage'
import './index.css'

// Ruteo mínimo: /config es la pantalla privada de configuración; todo lo demás es la app.
const esConfig = window.location.pathname.replace(/\/+$/, '') === '/config'

createRoot(document.getElementById('root')!).render(<StrictMode>{esConfig ? <ConfigPage /> : <App />}</StrictMode>)
