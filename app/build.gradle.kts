import java.util.Properties

plugins {
    id("com.android.application")
    id("com.google.gms.google-services")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) {
        file.inputStream().use(::load)
    }
}

android {
    namespace = "com.preschoolprimadonna.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.preschoolprimadonna.app"
        minSdk = 26
        targetSdk = 36
        versionCode = providers.gradleProperty("releaseVersionCode").orElse("20261010").get().toInt()
        versionName = "1.1"

        buildConfigField(
            "String",
            "SUPABASE_URL",
            "\"${localProperties.getProperty("SUPABASE_URL", "")}\""
        )
        buildConfigField(
            "String",
            "SUPABASE_ANON_KEY",
            "\"${localProperties.getProperty("SUPABASE_ANON_KEY", "")}\""
        )
        buildConfigField(
            "String",
            "WEB_APP_URL",
            "\"${localProperties.getProperty("WEB_APP_URL", "https://app.preschoolproai.com")}\""
        )
        buildConfigField(
            "String",
            "AUTH_REDIRECT_URL",
            "\"${localProperties.getProperty("AUTH_REDIRECT_URL", "preschoolprimadonna://auth-callback")}\""
        )
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }

    signingConfigs {
        create("upload") {
            System.getenv("ANDROID_UPLOAD_STORE_FILE")?.let { storeFile = file(it) }
            storePassword = System.getenv("ANDROID_UPLOAD_STORE_PASSWORD")
            keyAlias = System.getenv("ANDROID_UPLOAD_KEY_ALIAS")
            keyPassword = System.getenv("ANDROID_UPLOAD_KEY_PASSWORD")
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("upload")
        }
    }
}

dependencies {
    testImplementation("junit:junit:4.13.2")
    testImplementation("com.squareup.okhttp3:mockwebserver:5.4.0")

    implementation(platform("androidx.compose:compose-bom:2026.05.01"))
    implementation(platform("com.google.firebase:firebase-bom:34.16.0"))
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.core:core-ktx:1.18.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.10.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
    implementation("androidx.media3:media3-exoplayer:1.10.1")
    implementation("androidx.media3:media3-exoplayer-hls:1.10.1")
    implementation("androidx.media3:media3-ui:1.10.1")
    implementation("androidx.security:security-crypto:1.1.0")
    implementation("com.google.firebase:firebase-messaging")
    implementation("io.coil-kt:coil-compose:2.7.0")
    implementation("com.squareup.okhttp3:okhttp:5.4.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.11.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
