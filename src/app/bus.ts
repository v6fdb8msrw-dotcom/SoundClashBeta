/** Kleiner Ereignis-Bus für Oberflächen-Effekte (Toast, Konfetti, Partikel, Hintergrund). */
type Handler = (payload: unknown) => void
const handlers = new Map<string, Set<Handler>>()

export const bus = {
  on(ev: string, h: Handler) {
    if (!handlers.has(ev)) handlers.set(ev, new Set())
    handlers.get(ev)!.add(h)
    return () => {
      handlers.get(ev)?.delete(h)
    }
  },
  emit(ev: string, payload?: unknown) {
    handlers.get(ev)?.forEach((h) => h(payload))
  },
}
