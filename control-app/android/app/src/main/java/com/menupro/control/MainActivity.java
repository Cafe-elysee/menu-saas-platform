package com.menupro.control;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ComponentName;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
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

    private static final String PREFS = "menupro_setup";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(NativeSettingsPlugin.class);
        registerPlugin(PushNotificationsPlugin.class);
        createFcmChannel();
        super.onCreate(savedInstanceState);
        runFirstLaunchSetup();
    }

    private void createFcmChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;
        NotificationChannel ch = new NotificationChannel(
            "devis_control", "Commandes", NotificationManager.IMPORTANCE_HIGH
        );
        ch.setDescription("Nouvelles commandes reçues");
        ch.enableVibration(true);
        ch.enableLights(true);
        ch.setLightColor(Color.parseColor("#c8a44e"));
        ch.setShowBadge(true);
        nm.createNotificationChannel(ch);
    }

    private void runFirstLaunchSetup() {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);

        boolean batteryDone = false;
        try {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                i.setData(Uri.parse("package:" + getPackageName()));
                startActivity(i);
                batteryDone = true;
            }
        } catch (Exception e) {}

        if (!prefs.getBoolean("autostart_done", false)) {
            prefs.edit().putBoolean("autostart_done", true).apply();
            int delay = batteryDone ? 4000 : 1500;
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                NativeSettingsPlugin.openAutoStartActivity(this);
            }, delay);
        }
    }
}
