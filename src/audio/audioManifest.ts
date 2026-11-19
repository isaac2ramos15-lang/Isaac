import type { MusicStyle } from '../types/game';
import { BUNDLED_TRACK_REGISTRY } from './bundledAudioRegistry';

export type MusicContext = 'menu' | 'chase' | 'run' | 'shop';

export interface ExternalAudioManifest {
  music: Record<MusicContext, string>;
  styles: Record<MusicStyle, string>;
  ambientCity: string;
}

/**
 * Integración preparada para archivos de audio reales (.mp3 / .ogg / .wav)
 * empaquetados en /public/audio/ (via `npm run bundle:audio -- <archivo>`)
 * o cargados en el almacenamiento local sin conexión desde Configuración.
 */
export const EXTERNAL_AUDIO_MANIFEST: ExternalAudioManifest = {
  music: {
    menu: '/audio/music_menu.mp3',
    chase: '/audio/music_chase.mp3',
    run: '/audio/music_run.mp3',
    shop: '/audio/music_shop.mp3',
  },
  styles: {
    mi_musica: '/audio/custom_playlist.mp3',
    todas_las_noches_estuvo: BUNDLED_TRACK_REGISTRY.todas_las_noches_estuvo.publicPath,
    sopa_de_caracol: '/audio/sopa_de_caracol.mp3',
    tegucigalpa_noche: '/audio/tegucigalpa_noche.mp3',
    brisa_la_ceiba: '/audio/brisa_la_ceiba.mp3',
    orgullo_catracho: '/audio/orgullo_catracho.mp3',
    vuelo_guacamaya: '/audio/vuelo_guacamaya.mp3',
    raspe: '/audio/style_raspe.mp3',
    punta: '/audio/style_punta.mp3',
    rap: '/audio/style_rap.mp3',
    tropical: '/audio/style_tropical.mp3',
    urbana: '/audio/style_urbana.mp3',
    cinematica: '/audio/style_cinematica.mp3',
  },
  ambientCity: '/audio/ambient_tegucigalpa.mp3',
};
