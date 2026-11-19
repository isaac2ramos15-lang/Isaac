export interface BundledTrackEntry {
  id: 'todas_las_noches_estuvo';
  title: string;
  artist: string;
  styleLabel: string;
  publicPath: string;
  fileName: string | null;
  mimeType: string | null;
  byteSize: number;
  bundled: boolean;
  bundledAt: string | null;
}

export const BUNDLED_TRACK_REGISTRY: Record<'todas_las_noches_estuvo', BundledTrackEntry> = {
  todas_las_noches_estuvo: {
    id: 'todas_las_noches_estuvo',
    title: 'Todas las noches estuvo',
    artist: 'KBP',
    styleLabel: 'Raspe Catracho',
    publicPath: '/audio/todas_las_noches_estuvo.mp3',
    fileName: null,
    mimeType: null,
    byteSize: 0,
    bundled: false,
    bundledAt: null,
  },
};
