import '@fontsource/anton/latin-400.css'
import './styles/fonts.css'
import './styles/themes.css'
import './styles/app.css'
import './styles/remote.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Speicher nach Möglichkeit als dauerhaft markieren, damit der Browser lokale Daten nicht aufräumt
if (navigator.storage?.persist) {
  void navigator.storage.persisted().then((p) => (p ? undefined : navigator.storage.persist()))
}

const root = createRoot(document.getElementById('root')!)
// ?join=CODE → dieses Gerät ist ein Handy-Begleiter, sonst das Hauptgerät mit dem Spiel
const join = new URLSearchParams(location.search).get('join')
if (join) {
  void import('./remote/RemoteApp').then(({ RemoteApp }) =>
    root.render(
      <StrictMode>
        <RemoteApp code={join.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)} />
      </StrictMode>,
    ),
  )
} else {
  void import('./App.tsx').then(({ default: App }) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
}
