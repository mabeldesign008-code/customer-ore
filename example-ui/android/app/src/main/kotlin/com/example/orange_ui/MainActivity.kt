package com.example.orange_ui

import androidx.annotation.NonNull
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugins.GeneratedPluginRegistrant

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        GeneratedPluginRegistrant.registerWith(flutterEngine)
    }

    private fun handleMethod(call: MethodCall, result: MethodChannel.Result) {
//        when(call.method) {
//            "is_success_purchase" -> {
//                // Do things...
//                result.success(true)
//                return
//            }
//            else -> result.notImplemented()
//        }
    }
}
