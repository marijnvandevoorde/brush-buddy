import java.util.Properties

plugins {
    id("com.android.application")
}

// Signing config is read from keystore.properties (git-ignored) when present, so
// the project still builds (debug / unsigned release) on a machine without the key.
val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) keystorePropsFile.inputStream().use { load(it) }
}
val hasSigning = keystoreProps.getProperty("storeFile") != null

android {
    namespace = "co.smallvictories.brushbuddy"
    compileSdk = 36

    defaultConfig {
        // Must match the Play Console listing exactly, and is permanent once published.
        applicationId = "co.smallvictories.brushbuddy"
        minSdk = 24
        targetSdk = 36
        versionCode = 3
        versionName = "1.0.2"
    }

    signingConfigs {
        if (hasSigning) {
            create("release") {
                storeFile = rootProject.file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            if (hasSigning) signingConfig = signingConfigs.getByName("release")
        }
        debug {
            applicationIdSuffix = ".debug"
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    androidResources {
        // The hero clips are already VP9/WebM and the fonts are woff2; re-compressing
        // them in the APK only costs install size and decode time.
        noCompress += listOf("webm", "woff2")
    }

    packaging {
        resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
    }
}

// The web app at the repo root is the single source of truth. assets/www is
// generated from it and git-ignored, so it can never drift from the root copy or
// from the iOS bundle, which runs the same script. Without this the assets were
// hand-copied — and being git-ignored, a clean checkout produced an APK with no
// web app inside it.
val syncWebAssets by tasks.registering(Exec::class) {
    val repoRoot = rootProject.file("..")
    workingDir = repoRoot
    commandLine("./scripts/sync-web-assets.sh", File(projectDir, "src/main/assets/www").absolutePath)
    inputs.files(fileTree(repoRoot) {
        include("index.html", "styles.css", "fonts.css", "*.js", "*.webmanifest",
                "hero-*.png", "hero-*.webm")
        include("fonts/**", "icons/**")
        exclude("sw.js")
    })
    outputs.dir(File(projectDir, "src/main/assets/www"))
}

tasks.named("preBuild") { dependsOn(syncWebAssets) }

// A packaged APK with no web assets still "builds" perfectly happily and then
// shows a blank WebView on the device. Fail loudly instead.
tasks.register("checkWebAssets") {
    dependsOn(syncWebAssets)
    doLast {
        val index = File(projectDir, "src/main/assets/www/index.html")
        require(index.isFile) { "assets/www/index.html is missing — syncWebAssets did not run" }
    }
}
tasks.named("preBuild") { dependsOn("checkWebAssets") }
