plugins {
    kotlin("jvm")
    id("org.jetbrains.kotlin.plugin.serialization") version "2.1.0"
    id("org.jetbrains.compose")
    id("org.jetbrains.kotlin.plugin.compose")
}

group = "com.pwezacore"
version = "1.0.0"

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation(project(":report-core"))
    implementation(compose.desktop.currentOs)
    implementation(compose.uiTooling)
    implementation(compose.preview)
    implementation("org.jetbrains.compose.material3:material3-desktop:1.7.1")
    implementation("org.jetbrains.compose.material:material-icons-extended-desktop:1.7.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-swing:1.8.0")
    implementation(platform("io.github.jan-tennert.supabase:bom:3.1.2"))
    implementation("io.github.jan-tennert.supabase:postgrest-kt")
    implementation("io.github.jan-tennert.supabase:auth-kt")
    implementation("io.github.jan-tennert.supabase:realtime-kt")
    implementation("io.github.jan-tennert.supabase:storage-kt")
    // Ktor 3.x required by Supabase 3.x (aligns with Supabase's HTTP client)
    implementation(platform("io.ktor:ktor-bom:3.0.3"))
    implementation("io.ktor:ktor-client-cio")
    implementation("io.ktor:ktor-client-core")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
    implementation("org.jetbrains.exposed:exposed-core:0.45.0")
    implementation("org.jetbrains.exposed:exposed-dao:0.45.0")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.45.0")
    implementation("org.xerial:sqlite-jdbc:3.44.1.0")
    implementation("com.itextpdf:itext7-core:8.0.2")
}

compose.desktop {
    application {
        mainClass = "com.pwezacore.desktop.MainKt"
        nativeDistributions {
            targetFormats(org.jetbrains.compose.desktop.application.dsl.TargetFormat.Msi, org.jetbrains.compose.desktop.application.dsl.TargetFormat.Exe)
            packageName = "PwezaCore"
            packageVersion = "1.0.0"
            description = "PwezaCore School Management - Desktop"
            vendor = "PwezaCore"
            copyright = "PwezaCore"
            windows {
                menuGroup = "PwezaCore"
                upgradeUuid = "A1B2C3D4-E5F6-7890-ABCD-EF1234567890"
            }
        }
    }
}
