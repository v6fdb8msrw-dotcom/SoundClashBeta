import '@fontsource/dm-serif-display/latin-400.css'
import '@fontsource/dm-serif-display/latin-400-italic.css'
import '@fontsource/bungee/latin-400.css'
import '@fontsource/syne/latin-400.css'
import '@fontsource/syne/latin-700.css'
import '@fontsource/syne/latin-800.css'
import '@fontsource/instrument-serif/latin-400.css'
import '@fontsource/instrument-serif/latin-400-italic.css'
import '@fontsource/space-grotesk/latin-400.css'
import '@fontsource/space-grotesk/latin-600.css'
import '@fontsource/space-grotesk/latin-700.css'
import '@fontsource/anton/latin-400.css'
import '@fontsource/dm-sans/latin-400.css'
import '@fontsource/dm-sans/latin-600.css'
import '@fontsource/dm-sans/latin-700.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-600.css'
import '@fontsource/space-mono/latin-400.css'
import '@fontsource/space-mono/latin-700.css'
import '@fontsource/caveat/latin-500.css'
import '@fontsource/caveat/latin-700.css'
import '@fontsource/chakra-petch/latin-500.css'
import '@fontsource/chakra-petch/latin-600.css'
import '@fontsource/chakra-petch/latin-700.css'
import './styles/fonts.css'
import './styles/themes.css'
import './styles/base.css'
import './styles/background.css'
import './styles/components.css'
import './styles/screens.css'
import './styles/games.css'
import './styles/remote.css'
import './styles/simple.css'
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
