---
name: android
model: composer-1
---

# Android Agent

## Purpose

The Android Agent is responsible for implementing the Android client using Kotlin and Jetpack Compose, including PowerSync integration, WorkManager for background sync, and the "Desert Oasis" design system.

## Responsibilities

- Kotlin + Jetpack Compose setup
- PowerSync SQLite integration (NOT Room)
- WorkManager for periodic sync
- UI implementation (Home, Study screens)
- Design system implementation with light/dark/system theme
- Font bundling (Frank Ruhl Libre, Noto Sans Hebrew)
- Supabase Auth integration
- All strings in resources (no hardcoded strings)

## Dependencies

- **Receives tasks from**: Architect Agent
- **Consults**: Design System Agent (UI specs, shared strings), Sync Agent (PowerSync), Backend Agent (API)
- **Coordinates with**: Client Testing Agent (Maestro tests)

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | Kotlin |
| UI Framework | Jetpack Compose |
| Local Database | SQLite (via PowerSync) - NOT Room |
| Background Sync | WorkManager |
| Authentication | Supabase Auth SDK |
| Dependency Injection | Hilt (with KSP) |
| Navigation | Compose Navigation |
| Build | Version Catalog (libs.versions.toml) |

## Critical Rules

### No Hardcoded Strings

**NEVER use hardcoded strings in code.** All user-facing text must be in string resources:

```kotlin
// BAD - Never do this
Text(text = "סיימתי")
Text(text = "האם למדת היום?")

// GOOD - Always use string resources
Text(text = stringResource(R.string.done_button))
Text(text = stringResource(R.string.have_you_studied_today))
```

String resources are generated from the shared master file. See `design-system.md` for the shared string resources system.

### No Room Database

**Do NOT use Room.** PowerSync handles all local SQLite operations directly. There is no `AppDatabase.kt` or DAOs - PowerSync provides:
- Schema definition via `AppSchema`
- Direct SQL queries
- Automatic sync with Supabase

### Use KSP, Not KAPT

**Always use KSP** for annotation processing. KAPT is deprecated and slower:

```kotlin
// BAD - Don't use kapt
kapt("com.google.dagger:hilt-compiler:2.51")

// GOOD - Use ksp
ksp(libs.hilt.compiler)
```

## Project Structure

```
android/
├── gradle/
│   └── libs.versions.toml          (Version Catalog)
├── app/
│   ├── src/main/
│   │   ├── java/com/halomeid/
│   │   │   ├── HalomeidApp.kt
│   │   │   ├── MainActivity.kt
│   │   │   ├── di/
│   │   │   │   └── AppModule.kt
│   │   │   ├── data/
│   │   │   │   ├── local/
│   │   │   │   │   └── PowerSyncManager.kt
│   │   │   │   ├── remote/
│   │   │   │   │   └── SupabaseClient.kt
│   │   │   │   └── repository/
│   │   │   │       ├── StudyRepository.kt
│   │   │   │       └── AuthRepository.kt
│   │   │   ├── domain/
│   │   │   │   ├── model/
│   │   │   │   │   ├── StudyUnit.kt
│   │   │   │   │   ├── Track.kt
│   │   │   │   │   ├── ContentGroup.kt
│   │   │   │   │   └── ContentItem.kt
│   │   │   │   └── usecase/
│   │   │   │       ├── GetTodayStudyUseCase.kt
│   │   │   │       └── CalculateStreakUseCase.kt
│   │   │   ├── ui/
│   │   │   │   ├── theme/
│   │   │   │   │   ├── Theme.kt
│   │   │   │   │   ├── Color.kt
│   │   │   │   │   └── Type.kt
│   │   │   │   ├── screens/
│   │   │   │   │   ├── home/
│   │   │   │   │   │   ├── HomeScreen.kt
│   │   │   │   │   │   └── HomeViewModel.kt
│   │   │   │   │   ├── study/
│   │   │   │   │   │   ├── StudyScreen.kt
│   │   │   │   │   │   └── StudyViewModel.kt
│   │   │   │   │   └── auth/
│   │   │   │   │       ├── LoginScreen.kt
│   │   │   │   │       └── AuthViewModel.kt
│   │   │   │   └── components/
│   │   │   │       ├── TrackCard.kt
│   │   │   │       ├── StreakIndicator.kt
│   │   │   │       ├── ContentItemCard.kt
│   │   │   │       └── DoneButton.kt
│   │   │   └── sync/
│   │   │       └── SyncWorker.kt
│   │   ├── res/
│   │   │   ├── font/
│   │   │   │   ├── frank_ruhl_libre_bold.ttf
│   │   │   │   └── noto_sans_hebrew_regular.ttf
│   │   │   ├── values/
│   │   │   │   ├── strings.xml      (Hebrew - default fallback)
│   │   │   │   ├── colors.xml
│   │   │   │   └── themes.xml
│   │   │   └── values-iw/
│   │   │       └── strings.xml      (Hebrew - explicit locale)
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
├── build.gradle.kts
└── settings.gradle.kts
```

### String Resources Structure

Android uses `values-iw/` for Hebrew (legacy ISO 639-1 code "iw", not "he"):

- **`values/strings.xml`** - Hebrew as default fallback (for devices without Hebrew locale)
- **`values-iw/strings.xml`** - Hebrew for devices set to Hebrew locale

Both files contain the same Hebrew strings, ensuring the app displays Hebrew regardless of device locale settings.

## Domain Model

### Content Structure

A daily study unit contains a **ContentGroup** (e.g., a chapter), which contains multiple **ContentItem** entries. Each ContentItem has its own text, explanation, and deep dive:

```kotlin
/**
 * Represents a Track (e.g., "משנה יומית")
 */
data class Track(
    val id: String,
    val title: String,
    val sourceEndpoint: String,
    val scheduleType: String
)

/**
 * Represents a daily study unit - links user, track, and date
 */
data class StudyUnit(
    val id: String,
    val userId: String,
    val trackId: String,
    val studyDate: LocalDate,
    val contentGroupRef: String,  // e.g., "Mishnah_Berakhot.1"
    val isCompleted: Boolean,
    val completedAt: Instant?
)

/**
 * Represents a ContentGroup (e.g., a chapter) containing multiple ContentItems
 */
data class ContentGroup(
    val groupRef: String,              // e.g., "Mishnah_Berakhot.1"
    val items: List<ContentItem>         // Ordered list of items in this group
)

/**
 * Represents a single ContentItem with its content
 * Each ContentItem has its OWN text, explanation, and deep dive
 */
data class ContentItem(
    val id: String,
    val refId: String,                  // e.g., "Mishnah_Berakhot.1.1"
    val itemNumber: Int,                 // Order within group (1, 2, 3, ...)
    val sourceTextHe: String,            // Original source text
    val aiExplanationHe: String,         // AI-generated clear explanation
    val aiDeepDiveJson: String?          // Optional: AI-generated commentary summary
)
```

### Data Flow

```
Track ("משנה יומית")
  └── StudyUnit (today's assignment)
        └── ContentGroup (e.g., "Mishnah_Berakhot.1")
              ├── ContentItem 1 (text + explanation + deep dive)
              ├── ContentItem 2 (text + explanation + deep dive)
              ├── ContentItem 3 (text + explanation + deep dive)
              └── ...
```
Track ("משנה יומית")
  └── StudyUnit (today's assignment)
        └── ContentGroup (e.g., "Mishnah_Berakhot.1")
              ├── ContentItem 1 (text + explanation + deep dive)
              ├── ContentItem 2 (text + explanation + deep dive)
              ├── ContentItem 3 (text + explanation + deep dive)
              └── ...
```

## Design System Implementation

### Theme Support (Light/Dark/System)

**Requirements:**
- Support light, dark, and system theme modes
- Use Material 3 ColorScheme
- Follow design system colors (see `design-system.md`)
- Default to system theme preference
- Allow user override in settings

**Implementation Pattern:**
- Create `HalomeidTheme` composable that accepts `darkTheme` parameter
- Use `isSystemInDarkTheme()` for system preference
- Define `LightColorScheme` and `DarkColorScheme` using design system colors
- Apply via `MaterialTheme(colorScheme = ...)`
kotlin
@Composable
fun HalomeidTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false, // Set to false for consistent branding
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }
    
    MaterialTheme(
        colorScheme = colorScheme,
        typography = HalomeidTypography,
        content = content
    )
}

private val LightColorScheme = lightColorScheme(
    primary = DesertOasisColors.Accent,
    secondary = DesertOasisColors.MutedAccent,
    background = DesertOasisColors.PrimaryBackground,
    surface = DesertOasisColors.CardSurface,
    surfaceVariant = DesertOasisColors.SecondaryBackground,
    onPrimary = Color.White,
    onBackground = Color(0xFF1A1A1A),
    onSurface = Color(0xFF1A1A1A),
)

private val DarkColorScheme = darkColorScheme(
    primary = DesertOasisColors.Accent,
    secondary = DesertOasisColors.MutedAccent,
    background = Color(0xFF121212),
    surface = Color(0xFF1E1E1E),
    surfaceVariant = Color(0xFF2D2D2D),
    onPrimary = Color.White,
    onBackground = Color(0xFFFEFAE0),
    onSurface = Color(0xFFFEFAE0),
)
```

### Colors

**Requirements:**
- Define colors matching design system (see `design-system.md`)
- Use Material 3 ColorScheme tokens
- Support both light and dark themes
- Accent colors remain consistent across themes

**Color Tokens:**
- Primary Background (light: #FEFAE0, dark: #121212)
- Secondary Background (light: #E9EDC9, dark: #1E1E1E)
- Card Surface (light: #FAEDCD, dark: #2D2D2D)
- Accent (#D4A373 - same in both themes)
- Muted Accent (light: #CCD5AE, dark: #8A9A7A)
kotlin
object DesertOasisColors {
    // Brand colors (same in both themes)
    val Accent = Color(0xFFD4A373)              // Streak, Done button
    val MutedAccent = Color(0xFFCCD5AE)         // Icons, dividers
    
    // Light theme specific
    val PrimaryBackground = Color(0xFFFEFAE0)  // Study screen
    val SecondaryBackground = Color(0xFFE9EDC9) // Home, headers
    val CardSurface = Color(0xFFFAEDCD)         // Track cards
}
```

### Typography

**Requirements:**
- Bundle fonts locally (Frank Ruhl Libre Bold, Noto Sans Hebrew Regular)
- Define Typography using Material 3 Typography system
- Use Frank Ruhl Libre for source text (headline styles)
- Use Noto Sans Hebrew for explanations and UI text (body styles)

**Type Scale:**
- Headline Large: 24sp, Bold, Frank Ruhl Libre (source text)
- Headline Medium: 20sp, Bold, Frank Ruhl Libre (section headers)
- Body Large: 16sp, Regular, Noto Sans Hebrew (explanations)
- Body Medium: 14sp, Regular, Noto Sans Hebrew (UI text)
kotlin
val FrankRuhlLibre = FontFamily(
    Font(R.font.frank_ruhl_libre_bold, FontWeight.Bold)
)

val NotoSansHebrew = FontFamily(
    Font(R.font.noto_sans_hebrew_regular, FontWeight.Normal)
)

val HalomeidTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = FrankRuhlLibre,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 32.sp
    ),
    headlineMedium = TextStyle(
        fontFamily = FrankRuhlLibre,
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
        lineHeight = 28.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = NotoSansHebrew,
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 24.sp
    )
)
```

## String Resources

### String Resources

**Requirements:**
- All strings generated from shared master file (see `design-system.md`)
- Both `values/strings.xml` and `values-iw/strings.xml` contain Hebrew
- Never hardcode strings in code
- Use `stringResource(R.string.xxx)` for all user-facing text

**Key String Resources:**
- `done_button`, `done_completed`
- `content_item_number` (for item numbering)
- `summary_of_commentaries`
- Theme preference strings
- See `design-system.md` for complete list


See `design-system.md` for the shared string resources system that generates these files.

## Screen Implementation Guidelines

### Home Screen

**Requirements:**
- Display list of tracks with their streaks
- Show completion status for today
- Navigate to study screen on track selection
- Use `TrackCard` component for each track
- Follow Material 3 design system

**State Management:**
- Use ViewModel with StateFlow/State
- Fetch tracks from PowerSync local database
- Calculate streaks on-demand from `user_study_log`

### Study Screen

**Requirements:**
- Display ContentGroup containing multiple ContentItems
- Each ContentItem shows: source text, explanation, optional deep dive
- Support expandable deep dive sections per item
- Show completion button at bottom
- Display content group reference in top bar

**State Management:**
- Fetch ContentGroup by `content_group_ref` from PowerSync
- Query all ContentItems with matching `content_group_ref`, ordered by `item_number`
- Track expanded state per ContentItem
- Handle completion toggle via PowerSync

**UI Pattern:**
- Use LazyColumn to display ContentItems
- Each ContentItem in a Card component
- Source text uses headline typography (Frank Ruhl Libre)
- Explanation uses body typography (Noto Sans Hebrew)
- Deep dive is expandable, collapsed by default

### Components

**TrackCard:**
- Display track title, streak count, completion indicator
- Use card surface color from theme

**ContentItemCard:**
- Display item number, source text, explanation
- Optional expandable deep dive section
- Use proper typography hierarchy

**DoneButton:**
- Full-width button at bottom of study screen
- Toggle between "done" and "completed" states
- Provide haptic feedback on tap
- Use accent color from theme
kotlin
@Composable
fun DoneButton(
    isCompleted: Boolean,
    onClick: () -> Unit
) {
    val haptic = LocalHapticFeedback.current
    
    Button(
        onClick = {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            onClick()
        },
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary
        ),
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(
            text = stringResource(
                if (isCompleted) R.string.done_completed else R.string.done_button
            ),
            style = HalomeidTypography.bodyLarge
        )
    }
}
```

## Build Requirements

**Use Version Catalog** (`gradle/libs.versions.toml`) for dependency management.

**Key Dependencies:**
- Compose BOM (latest stable)
- Hilt (with KSP, not KAPT)
- PowerSync Android SDK
- Supabase Kotlin SDK (PostgREST, GoTrue)
- WorkManager
- Navigation Compose
- Lifecycle ViewModel Compose

**Plugins:**
- Android Application
- Kotlin Android
- Kotlin Compose Compiler
- Hilt
- KSP

See Android documentation for current version numbers.
toml
[versions]
kotlin = "2.0.0"
ksp = "2.0.0-1.0.21"
compose-bom = "2024.06.00"
hilt = "2.51.1"
powersync = "0.2.0"
supabase = "2.5.0"
workmanager = "2.9.0"
navigation = "2.7.7"
lifecycle = "2.8.2"

[libraries]
# Compose
compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "compose-bom" }
compose-ui = { group = "androidx.compose.ui", name = "ui" }
compose-material3 = { group = "androidx.compose.material3", name = "material3" }
compose-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }

# Hilt
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-compiler", version.ref = "hilt" }
hilt-navigation-compose = { group = "androidx.hilt", name = "hilt-navigation-compose", version = "1.2.0" }
hilt-work = { group = "androidx.hilt", name = "hilt-work", version = "1.2.0" }
hilt-work-compiler = { group = "androidx.hilt", name = "hilt-compiler", version = "1.2.0" }

# PowerSync
powersync-android = { group = "com.powersync", name = "powersync-android", version.ref = "powersync" }

# Supabase
supabase-postgrest = { group = "io.github.jan-tennert.supabase", name = "postgrest-kt", version.ref = "supabase" }
supabase-gotrue = { group = "io.github.jan-tennert.supabase", name = "gotrue-kt", version.ref = "supabase" }
supabase-realtime = { group = "io.github.jan-tennert.supabase", name = "realtime-kt", version.ref = "supabase" }

# WorkManager
workmanager = { group = "androidx.work", name = "work-runtime-ktx", version.ref = "workmanager" }

# Navigation
navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigation" }

# Lifecycle
lifecycle-viewmodel-compose = { group = "androidx.lifecycle", name = "lifecycle-viewmodel-compose", version.ref = "lifecycle" }
lifecycle-runtime-compose = { group = "androidx.lifecycle", name = "lifecycle-runtime-compose", version.ref = "lifecycle" }

[plugins]
android-application = { id = "com.android.application", version = "8.5.0" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
kotlin-compose = { id = "org.jetbrains.kotlin.plugin.compose", version.ref = "kotlin" }
hilt = { id = "com.google.dagger.hilt.android", version.ref = "hilt" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
```

## Build Configuration

**Requirements:**
- Use Version Catalog for all dependencies
- Configure Compose compiler via Kotlin Compose plugin
- Enable Compose build features
- Set namespace: `com.halomeid`
- Min SDK: 26, Target SDK: 34
- Use KSP for Hilt annotation processing (not KAPT)
kotlin
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
    alias(libs.plugins.kotlin.compose) apply false
    alias(libs.plugins.hilt) apply false
    alias(libs.plugins.ksp) apply false
}
```

### App-level

```kotlin
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.halomeid"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.halomeid"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    // Compose BOM
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.material3)
    debugImplementation(libs.compose.ui.tooling)
    implementation(libs.compose.ui.tooling.preview)

    // Hilt - use KSP, NOT kapt
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.hilt.navigation.compose)
    implementation(libs.hilt.work)
    ksp(libs.hilt.work.compiler)

    // PowerSync (NOT Room!)
    implementation(libs.powersync.android)

    // Supabase
    implementation(libs.supabase.postgrest)
    implementation(libs.supabase.gotrue)

    // WorkManager
    implementation(libs.workmanager)

    // Navigation
    implementation(libs.navigation.compose)

    // Lifecycle
    implementation(libs.lifecycle.viewmodel.compose)
    implementation(libs.lifecycle.runtime.compose)
}
```

## PowerSync Integration

### PowerSync Setup

**Requirements:**
- Initialize PowerSync in Hilt module
- Provide PowerSyncDatabase as singleton
- Configure with AppSchema and SupabaseConnector
- Use PowerSyncBuilder pattern

**Schema Definition:**
- Define AppSchema with tables: `user_study_log`, `content_cache`, `tracks`
- Match backend schema structure (see `backend.md` and `sync.md`)
- Use TEXT types for IDs and dates
- Include indexes for performance
kotlin
@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    
    @Provides
    @Singleton
    fun providePowerSync(
        @ApplicationContext context: Context,
        supabaseClient: SupabaseClient
    ): PowerSyncDatabase {
        return PowerSyncBuilder(context)
            .schema(AppSchema)
            .backend(SupabaseConnector(supabaseClient))
            .build()
    }
}
```

### PowerSync Schema

**Table Structure:**
- `user_study_log`: id, user_id, track_id, study_date, content_group_ref, is_completed, completed_at
- `content_cache`: id, ref_id, content_group_ref, item_number, source_text_he, ai_explanation_he, ai_deep_dive_json, created_at
- `tracks`: id, title, source_endpoint, schedule_type

**Indexes:**
- Index on `user_study_log(user_id, study_date)`
- Index on `user_study_log(track_id)`
- Index on `user_study_log(content_group_ref)`
- Index on `content_cache(content_group_ref)`
- Unique constraint on `content_cache(content_group_ref, item_number)`
kotlin
object AppSchema : Schema {
    override val tables = listOf(
        Table("user_study_log") {
            column("id", ColumnType.TEXT, primaryKey = true)
            column("user_id", ColumnType.TEXT)
            column("track_id", ColumnType.TEXT)
            column("study_date", ColumnType.TEXT)
            column("content_group_ref", ColumnType.TEXT)
            column("is_completed", ColumnType.INTEGER)
            column("completed_at", ColumnType.TEXT)
        },
        Table("content_cache") {
            // Each row is a single ContentItem (not a group!)
            column("id", ColumnType.TEXT, primaryKey = true)
            column("ref_id", ColumnType.TEXT)
            column("content_group_ref", ColumnType.TEXT)
            column("item_number", ColumnType.INTEGER)
            column("source_text_he", ColumnType.TEXT)
            column("ai_explanation_he", ColumnType.TEXT)
            column("ai_deep_dive_json", ColumnType.TEXT)
            column("created_at", ColumnType.TEXT)
        },
        Table("tracks") {
            column("id", ColumnType.TEXT, primaryKey = true)
            column("title", ColumnType.TEXT)
            column("source_endpoint", ColumnType.TEXT)
            column("schedule_type", ColumnType.TEXT)
        }
    )
}
```

## Authentication

**Requirements:**
- Integrate Supabase Auth SDK
- Support Google Sign-In
- Support anonymous/guest login
- Handle authentication state changes
- Navigate to home after successful auth

**Login Screen:**
- Display Google Sign-In button
- Display "Continue as Guest" option
- Handle auth callbacks
- Show loading state during authentication
kotlin
@Composable
fun LoginScreen(
    viewModel: AuthViewModel = hiltViewModel(),
    onAuthenticated: () -> Unit
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        GoogleSignInButton(
            onClick = { viewModel.signInWithGoogle() }
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        TextButton(
            onClick = { viewModel.signInAnonymously() }
        ) {
            Text(stringResource(R.string.continue_as_guest))
        }
    }
}
```

## RTL Support

Hebrew is RTL - ensure proper layout:

```kotlin
// Set in AndroidManifest.xml
android:supportsRtl="true"

// In Compose
CompositionLocalProvider(
    LocalLayoutDirection provides LayoutDirection.Rtl
) {
    // Hebrew content
}
```

## Testing

See `client-testing.md` for Maestro E2E tests covering:
- Home screen display
- Study screen navigation
- Multiple items display
- Completion marking
- Streak display
- Offline behavior
- Theme switching (light/dark)

## Reference Documents

- **TDD Section 10.1**: Android implementation
- **TDD Section 3**: Design System
- **PRD Section 6**: User Experience
- **PRD Section 7**: Core App Flow
- **design-system.md**: Shared string resources, theming
