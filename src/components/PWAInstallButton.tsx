import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Laptop,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [otaStatus, setOtaStatus] = useState<string | null>(null);
  const [checkingOta, setCheckingOta] = useState(false);

  const hostInfo = useMemo(() => {
    if (typeof window === 'undefined') {
      return { origin: '', isPreviewHost: true };
    }
    const { hostname, origin } = window.location;
    const isPreviewHost =
      hostname.includes('ais-dev-') ||
      hostname.includes('ais-pre-') ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1';
    return { origin, isPreviewHost };
  }, []);

  const [customUrl, setCustomUrl] = useState(() =>
    hostInfo.isPreviewHost ? '' : hostInfo.origin,
  );

  if (isInstalled) {
    return null;
  }

  const effectiveUrl = (customUrl.trim() || (!hostInfo.isPreviewHost ? hostInfo.origin : '')).replace(
    /\/+$/,
    '',
  );

  const copyText = async (value: string, key: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2200);
  };

  const handleCheckOta = async () => {
    if (!('serviceWorker' in navigator)) {
      setOtaStatus('Este navegador no soporta Service Worker OTA.');
      return;
    }
    setCheckingOta(true);
    setOtaStatus(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setOtaStatus('Abre la app en Chrome o Edge sobre tu dominio publicado para activar la caché OTA offline.');
        return;
      }
      await registration.update();
      if (registration.waiting || registration.installing) {
        setOtaStatus('Nueva actualización OTA descargándose; se aplicará automáticamente.');
      } else {
        setOtaStatus('App al día con la última versión OTA en caché.');
      }
    } catch {
      setOtaStatus('No se pudo verificar OTA en vista previa; pruébalo desde tu dominio publicado.');
    } finally {
      setCheckingOta(false);
    }
  };

  const nativeAndroidCmd =
    'npm install && npm install @capacitor/core @capacitor/cli @capacitor/android && npm run build && npx cap add android && npx cap sync android';
  const windowsExeCmd =
    'npm install && npm install -D electron electron-builder && npm run electron:build:win';

  const pwabuilderHref = effectiveUrl
    ? `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(effectiveUrl)}`
    : 'https://www.pwabuilder.com/';

  return (
    <>
      <div className="flex items-center gap-2">
        {isInstallable && (
          <button
            type="button"
            onClick={() => void install()}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3.5 py-2 text-xs font-bold text-slate-950 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Instalar App Offline</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl bg-[#090f1a]/90 hover:bg-[#132238] border border-white/15 px-3 py-2 text-xs font-semibold text-sky-300 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>{isIOS ? 'Instalar en iOS' : isInstallable ? 'APK / Windows' : 'Descargar APK / PC'}</span>
        </button>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#040a14]/92 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-apk-title"
        >
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0b1322] border border-white/15 p-5 sm:p-6 shadow-2xl text-left">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-sky-300">
                  Android (.apk) · Windows (.exe) · Música Offline
                </div>
                <h3 id="install-apk-title" className="font-display text-2xl font-extrabold text-white mt-0.5">
                  Descargar en Android y Windows
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Cerrar ventana"
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white/8 hover:bg-white/15 text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Section 1: Clean Free Hosting URL + Offline + Music */}
            <div className="mt-4 rounded-xl bg-[#070d16] border border-sky-400/25 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
                  1. Instalar App Offline en Android y Windows (Música Guardada Localmente)
                </span>
                {isInstallable && (
                  <button
                    type="button"
                    onClick={() => void install()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-bold text-slate-950 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Instalar ahora</span>
                  </button>
                )}
              </div>

              {hostInfo.isPreviewHost ? (
                <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
                  <p>
                    Publica gratis la carpeta <code>dist/</code> (el proyecto ya incluye <code>netlify.toml</code>,{' '}
                    <code>vercel.json</code> y <code>_redirects</code>) para obtener tu URL propia sin &quot;ia&quot;,
                    instalarla en Android y Windows sin internet y conservar tu música agregada offline:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <a
                      href="https://app.netlify.com/drop"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 px-3 py-2 text-xs font-bold text-emerald-300"
                    >
                      <span>Netlify Drop</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                    <a
                      href="https://pages.cloudflare.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 px-3 py-2 text-xs font-bold text-amber-300"
                    >
                      <span>Cloudflare Pages</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                    <a
                      href="https://vercel.com/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 px-3 py-2 text-xs font-bold text-sky-300"
                    >
                      <span>Vercel Gratis</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>

                  <div className="pt-1">
                    <label htmlFor="custom-game-url" className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Pega aquí tu URL publicada para generar el APK en PWABuilder:
                    </label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="relative flex-1">
                        <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="custom-game-url"
                          type="url"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          placeholder="https://ruta-catracha.netlify.app"
                          className="w-full rounded-lg bg-black/50 border border-white/15 pl-8 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                        />
                      </div>
                      {effectiveUrl && (
                        <button
                          type="button"
                          onClick={() => void copyText(effectiveUrl, 'url')}
                          className="min-h-[36px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-3 py-1.5 text-xs font-bold text-slate-950 cursor-pointer shrink-0"
                        >
                          {copiedKey === 'url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'url' ? 'Copiada' : 'Copiar'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <code className="flex-1 rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-xs text-amber-200 break-all select-all">
                    {effectiveUrl}
                  </code>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => void copyText(effectiveUrl, 'url')}
                      className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 px-3 py-1.5 text-xs font-bold text-slate-950 cursor-pointer"
                    >
                      {copiedKey === 'url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'url' ? 'Copiada' : 'Copiar URL'}</span>
                    </button>
                    <a
                      href={effectiveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir</span>
                    </a>
                  </div>
                </div>
              )}

              {isIOS ? (
                <p className="text-xs text-slate-300 leading-relaxed">
                  En iPhone / iPad: abre tu URL en <strong>Safari</strong>, toca{' '}
                  <strong>Compartir</strong> y elige <strong>Agregar a pantalla de inicio</strong> para jugar sin internet.
                </p>
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong>En Android (Chrome):</strong> menú <strong>⋮ → Instalar aplicación</strong>.{' '}
                  <strong>En Windows (Edge / Chrome):</strong> icono <strong>Instalar</strong> en la barra de direcciones (se abre sin navegador y conserva tus canciones MP3/WAV agregadas <strong>sin internet</strong>).
                </p>
              )}

              <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400">
                  {otaStatus ?? 'Service Worker OTA + IndexedDB Persistente activos para audio offline.'}
                </span>
                <button
                  type="button"
                  onClick={() => void handleCheckOta()}
                  disabled={checkingOta}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-sky-200 cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingOta ? 'animate-spin' : ''}`} />
                  <span>{checkingOta ? 'Buscando...' : 'Buscar OTA'}</span>
                </button>
              </div>
            </div>

            {/* Section 2: Generate Android .APK */}
            <div className="mt-4 rounded-xl bg-[#070d16] border border-white/15 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Smartphone className="w-3.5 h-3.5" />
                <span>2. Descargar Archivo .APK (Android)</span>
              </div>

              <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">
                    Opción A: Generar APK directo desde tu URL (sin Android Studio)
                  </span>
                  <a
                    href={pwabuilderHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 px-3 py-1.5 text-xs font-bold text-slate-950 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Ir a PWABuilder</span>
                  </a>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Abre <strong>PWABuilder</strong> con tu URL gratuita de Netlify, Cloudflare o Vercel y elige{' '}
                  <strong>Package for Stores → Android</strong> para descargar tu paquete <strong>.apk / .aab</strong>.
                </p>
              </div>

              <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">
                    Opción B: Compilar APK nativo local (Capacitor + AdMob + Play Billing)
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyText(nativeAndroidCmd, 'android')}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer shrink-0"
                  >
                    {copiedKey === 'android' ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'android' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <code className="block rounded bg-black/50 border border-white/10 px-2.5 py-2 text-[11px] text-emerald-300 break-all">
                  {nativeAndroidCmd}
                </code>
              </div>
            </div>

            {/* Section 3: Windows .EXE */}
            <div className="mt-4 rounded-xl bg-[#070d16] border border-white/15 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                <Laptop className="w-3.5 h-3.5" />
                <span>3. Descargar Instalador para Windows (.exe)</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Puedes instalar el juego al instante desde <strong>Edge / Chrome en Windows</strong> (acceso directo en el Escritorio y sin internet), o compilar el instalador nativo{' '}
                <code>release/Ruta Catracha Setup.exe</code> en una PC con Windows ejecutando:
              </p>

              <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-white">Comando instalador Windows (.exe)</span>
                  <button
                    type="button"
                    onClick={() => void copyText(windowsExeCmd, 'win')}
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white cursor-pointer shrink-0"
                  >
                    {copiedKey === 'win' ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'win' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <code className="block rounded bg-black/50 border border-white/10 px-2.5 py-2 text-[11px] text-sky-300 break-all">
                  {windowsExeCmd}
                </code>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-4 min-h-[44px] w-full rounded-xl bg-[#00a8e8] hover:bg-[#0ea5e9] text-slate-950 text-sm font-bold cursor-pointer"
            >
              Volver al Menú
            </button>
          </div>
        </div>
      )}
    </>
  );
}
