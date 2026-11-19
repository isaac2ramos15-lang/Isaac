package com.isaacramos.rutacatracha;

import android.app.Activity;
import androidx.annotation.NonNull;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Collections;
import java.util.List;

/**
 * Puente nativo de Google Play Billing Library v6+ para RUTA CATRACHA.
 * SKUs oficiales configurables en Google Play Console (cuenta de Isaac Ramos):
 *  - rc_coins_pack_500   (Consumible)
 *  - rc_coins_pack_2000  (Consumible)
 *  - rc_remove_ads       (Compra única no consumible)
 */
@CapacitorPlugin(name = "RutaCatrachaNativeBilling")
public class PlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    private BillingClient billingClient;
    private PluginCall pendingPurchaseCall;
    private String pendingSku;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases()
                .build();
        connectBillingClient(null);
    }

    private void connectBillingClient(Runnable onConnected) {
        if (billingClient.isReady()) {
            if (onConnected != null) onConnected.run();
            return;
        }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && onConnected != null) {
                    onConnected.run();
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                // Se reconectará automáticamente en la siguiente solicitud.
            }
        });
    }

    @PluginMethod
    public void purchaseSku(PluginCall call) {
        String sku = call.getString("sku");
        if (sku == null || sku.isEmpty()) {
            JSObject res = new JSObject();
            res.put("ok", false);
            res.put("error", "SKU inválido");
            call.resolve(res);
            return;
        }

        connectBillingClient(() -> {
            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(Collections.singletonList(
                            QueryProductDetailsParams.Product.newBuilder()
                                    .setProductId(sku)
                                    .setProductType(BillingClient.ProductType.INAPP)
                                    .build()
                    ))
                    .build();

            billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsList) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || productDetailsList.isEmpty()) {
                    JSObject res = new JSObject();
                    res.put("ok", false);
                    res.put("error", "Producto no encontrado en Google Play Console: " + sku);
                    call.resolve(res);
                    return;
                }

                Activity activity = getActivity();
                if (activity == null) {
                    JSObject res = new JSObject();
                    res.put("ok", false);
                    res.put("error", "Actividad Android no disponible");
                    call.resolve(res);
                    return;
                }

                ProductDetails productDetails = productDetailsList.get(0);
                BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                        .setProductDetailsParamsList(Collections.singletonList(
                                BillingFlowParams.ProductDetailsParams.newBuilder()
                                        .setProductDetails(productDetails)
                                        .build()
                        ))
                        .build();

                pendingPurchaseCall = call;
                pendingSku = sku;
                activity.runOnUiThread(() -> billingClient.launchBillingFlow(activity, flowParams));
            });
        });
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        connectBillingClient(() -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build();
            billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
                JSArray skus = new JSArray();
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    for (Purchase p : purchases) {
                        if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                            for (String prod : p.getProducts()) {
                                skus.put(prod);
                            }
                            acknowledgeIfNeeded(p);
                        }
                    }
                }
                JSObject res = new JSObject();
                res.put("skus", skus);
                call.resolve(res);
            });
        });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, List<Purchase> purchases) {
        if (pendingPurchaseCall == null) return;
        PluginCall call = pendingPurchaseCall;
        String sku = pendingSku;
        pendingPurchaseCall = null;
        pendingSku = null;

        JSObject res = new JSObject();
        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null && !purchases.isEmpty()) {
            Purchase purchase = purchases.get(0);
            if ("rc_remove_ads".equals(sku)) {
                acknowledgeIfNeeded(purchase);
            } else {
                ConsumeParams consumeParams = ConsumeParams.newBuilder()
                        .setPurchaseToken(purchase.getPurchaseToken())
                        .build();
                billingClient.consumeAsync(consumeParams, (consumeResult, token) -> {});
            }
            res.put("ok", true);
            res.put("purchaseToken", purchase.getPurchaseToken());
        } else {
            res.put("ok", false);
            res.put("error", billingResult.getDebugMessage());
        }
        call.resolve(res);
    }

    private void acknowledgeIfNeeded(Purchase purchase) {
        if (!purchase.isAcknowledged()) {
            AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
                    .setPurchaseToken(purchase.getPurchaseToken())
                    .build();
            billingClient.acknowledgePurchase(params, billingResult -> {});
        }
    }
}
