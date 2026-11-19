export type AdPlacement = 'rewarded_coins' | 'rewarded_run_bonus' | 'interstitial_gameover';

export type PlatformTarget = 'web' | 'android_apk' | 'windows_exe' | 'ios_safari';

export interface BillingPurchaseResult {
  status: 'purchased' | 'restored' | 'cancelled' | 'error' | 'store_unavailable_outside_android';
  sku: string;
  message: string;
}

/**
 * IDs oficiales de prueba de Google AdMob durante desarrollo.
 * Reemplazar en native/android-setup/ y variables de compilación al publicar en Google Play Console.
 */
export const ADMOB_TEST_CONFIG = {
  androidAppId: 'ca-app-pub-3940256099942544~3347511713',
  rewardedUnitId: 'ca-app-pub-3940256099942544/5224354917',
  interstitialUnitId: 'ca-app-pub-3940256099942544/1033173712',
  ownerPayoutEmailNote: 'isaac2ramos15@gmail.com (configurar cuenta verificada de AdMob / Play Console)',
} as const;

declare global {
  interface Window {
    RutaCatrachaNativeBilling?: {
      purchaseSku: (sku: string) => Promise<{ ok: boolean; error?: string; purchaseToken?: string }>;
      restorePurchases: () => Promise<{ skus: string[] }>;
    };
    RutaCatrachaNativeAdMob?: {
      showRewarded: (unitId: string) => Promise<{ rewarded: boolean }>;
      showInterstitial: (unitId: string) => Promise<void>;
    };
    RutaCatrachaDesktop?: {
      platform: string;
      toggleFullscreen?: () => void;
    };
    Capacitor?: unknown;
  }
}

class MonetizationArchitecture {
  private runsSinceInterstitial = 0;

  public detectPlatform(): PlatformTarget {
    if (typeof window === 'undefined') return 'web';
    if (window.Capacitor) return 'android_apk';
    if (window.RutaCatrachaDesktop || /Electron/i.test(navigator.userAgent || '')) return 'windows_exe';
    const ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua) && /Safari/i.test(ua)) return 'ios_safari';
    return 'web';
  }

  public isOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  public shouldShowInterstitialOnGameOver(adsRemoved: boolean): boolean {
    if (adsRemoved || !this.isOnline()) return false;
    this.runsSinceInterstitial += 1;
    if (this.runsSinceInterstitial >= 3) {
      this.runsSinceInterstitial = 0;
      return true;
    }
    return false;
  }

  public async requestStorePurchase(sku: string): Promise<BillingPurchaseResult> {
    if (!this.isOnline()) {
      return {
        status: 'error',
        sku,
        message: 'Sin conexión a internet. Las compras en Google Play estarán disponibles al reconectarse.',
      };
    }

    if (typeof window !== 'undefined' && window.RutaCatrachaNativeBilling) {
      try {
        const res = await window.RutaCatrachaNativeBilling.purchaseSku(sku);
        if (res.ok) {
          return {
            status: 'purchased',
            sku,
            message: `Compra verificada en Google Play (${sku}).`,
          };
        }
        return {
          status: 'cancelled',
          sku,
          message: res.error || 'Compra cancelada o pendiente de verificación.',
        };
      } catch (err) {
        return {
          status: 'error',
          sku,
          message: err instanceof Error ? err.message : 'Error al conectar con Google Play Billing.',
        };
      }
    }

    return {
      status: 'store_unavailable_outside_android',
      sku,
      message:
        'Google Play Billing no se simula con dinero falso fuera de Android APK. El puente nativo queda listo en /native/android-setup/PlayBillingPlugin.java.',
    };
  }

  public async restorePurchases(): Promise<{ skus: string[]; message: string }> {
    if (!this.isOnline()) {
      return {
        skus: [],
        message: 'Se requiere conexión a internet para consultar compras anteriores en Google Play.',
      };
    }
    if (typeof window !== 'undefined' && window.RutaCatrachaNativeBilling) {
      try {
        const res = await window.RutaCatrachaNativeBilling.restorePurchases();
        return {
          skus: res.skus,
          message:
            res.skus.length > 0
              ? `Compras restauradas: ${res.skus.join(', ')}`
              : 'No se encontraron compras previas en esta cuenta de Google Play.',
        };
      } catch {
        return { skus: [], message: 'No se pudo consultar Google Play Billing en este momento.' };
      }
    }
    return {
      skus: [],
      message: 'La restauración de compras se ejecuta automáticamente dentro de la APK firmada con Google Play.',
    };
  }
}

export const monetizationService = new MonetizationArchitecture();
