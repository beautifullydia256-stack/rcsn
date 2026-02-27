plugins {
    kotlin("jvm") version "2.1.0"
}

group = "com.pwezacore"
version = "1.0.0"

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0")
}
