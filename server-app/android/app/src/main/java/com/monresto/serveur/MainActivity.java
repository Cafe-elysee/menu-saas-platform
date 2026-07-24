package com.monresto.serveur;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ComponentName;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.provider.Settings;
import android.net.Uri;

@CapacitorPlugin(name = "NativeSettings")
class NativeSettingsPlugin extends Plugin {

    @PluginMethod
    public void openNotifications(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
            i.putExtra(Settings.EXTRA_APP_PACKAGE, getActivity().getPackageName());
            getActivity().startActivity(i);
        } catch (Exception e) {}
        call.resolve();
    }

    @PluginMethod
    public void openBattery(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            i.setData(Uri.parse("package:" + getActivity().getPackageName()));
            getActivity().startActivity(i);
        } catch (Exception e) {}
        call.resolve();
    }

    @PluginMethod
    public void openAutoStart(PluginCall call) {
        openAutoStartActivity(getActivity());
        call.resolve();
    }

    static void openAutoStartActivity(android.app.Activity activity) {
        boolean opened = false;
        String[][] miuiIntents = {
            { "com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity" },
            { "com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity" }
        };
        for (String[] comp : miuiIntents) {
            try {
                Intent i = new Intent();
                i.setComponent(new ComponentName(comp[0], comp[1]));
                activity.startActivity(i);
                opened = true;
                break;
            } catch (Exception e) {}
        }
        if (!opened) {
            try {
                Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                i.setData(Uri.parse("package:" + activity.getPackageName()));
                activity.startActivity(i);
            } catch (Exception e) {}
        }
    }
}

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSettingsPlugin.class);
        registerPlugin(PushNotificationsPlugin.class);
        createFcmChannel();
        super.onCreate(savedInstanceState);
    }

    private void createFcmChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;
        // Supprimer l'ancien canal si présent (importance potentiellement dégradée)
        nm.deleteNotificationChannel("mp_srv_v2");
        // Créer le nouveau canal avec IMPORTANCE_HIGH garanti
        NotificationChannel ch = new NotificationChannel(
            "mp_srv_v3", "Commandes & Appels", NotificationManager.IMPORTANCE_HIGH
        );
        ch.setDescription("Nouvelles commandes et appels de table");
        ch.enableVibration(true);
        ch.enableLights(true);
        ch.setLightColor(Color.parseColor("#c8a44e"));
        ch.setShowBadge(true);
        nm.createNotificationChannel(ch);
    }
}
