package com.isaacramos.rutacatracha;

import android.app.Activity;
import androidx.annotation.NonNull;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

/**
 * Puente nativo de Google AdMob para Android APK.
 * Usa IDs de prueba oficiales durante desarrollo; reemplazar con tus Ad Unit IDs reales
 * en producción dentro de Google AdMob / Play Console (isaac2ramos15@gmail.com).
 */
@CapacitorPlugin(name = "RutaCatrachaNativeAdMob")
public class AdMobBridge extends Plugin {

    private RewardedAd loadedRewardedAd;
    private InterstitialAd loadedInterstitialAd;

    @Override
    public void load() {
        MobileAds.initialize(getContext(), initializationStatus -> {});
    }

    @PluginMethod
    public void showRewarded(PluginCall call) {
        String unitId = call.getString("unitId", "ca-app-pub-3940256099942544/5224354917");
        Activity activity = getActivity();
        if (activity == null) {
            JSObject res = new JSObject();
            res.put("rewarded", false);
            call.resolve(res);
            return;
        }

        activity.runOnUiThread(() -> {
            AdRequest adRequest = new AdRequest.Builder().build();
            RewardedAd.load(activity, unitId, adRequest, new RewardedAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull RewardedAd ad) {
                    loadedRewardedAd = ad;
                    final boolean[] earned = {false};
                    loadedRewardedAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            JSObject res = new JSObject();
                            res.put("rewarded", earned[0]);
                            call.resolve(res);
                        }
                    });
                    loadedRewardedAd.show(activity, rewardItem -> earned[0] = true);
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    JSObject res = new JSObject();
                    res.put("rewarded", false);
                    call.resolve(res);
                }
            });
        });
    }

    @PluginMethod
    public void showInterstitial(PluginCall call) {
        String unitId = call.getString("unitId", "ca-app-pub-3940256099942544/1033173712");
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve();
            return;
        }

        activity.runOnUiThread(() -> {
            AdRequest adRequest = new AdRequest.Builder().build();
            InterstitialAd.load(activity, unitId, adRequest, new InterstitialAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull InterstitialAd interstitialAd) {
                    loadedInterstitialAd = interstitialAd;
                    loadedInterstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                        @Override
                        public void onAdDismissedFullScreenContent() {
                            call.resolve();
                        }
                    });
                    loadedInterstitialAd.show(activity);
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    call.resolve();
                }
            });
        });
    }
}
