plugins {
    kotlin("jvm") version "2.1.0"
    id("org.jetbrains.compose") version "1.7.1"
    id("org.jetbrains.kotlin.plugin.compose") version "2.1.0"
}

allprojects {
    repositories {
        google()
        mavenCentral()
        maven("https://maven.pkg.jetbrains.space/public/p/compose/dev")
    }
}

subprojects {
    apply(plugin = "org.jetbrains.kotlin.jvm")
    apply(plugin = "org.jetbrains.compose")
    apply(plugin = "org.jetbrains.kotlin.plugin.compose")

    dependencies {
        implementation(compose.desktop.currentOs)
        implementation(compose.uiTooling)
        implementation(compose.preview)
    }
}
