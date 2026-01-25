---
name: ios
model: composer-1
---

# iOS Agent

## Purpose

The iOS Agent is responsible for implementing the iOS client using Swift and SwiftUI, including custom offline-first sync with SQLite and Supabase Realtime, BGAppRefreshTask for background sync, and the "Desert Oasis" design system.

## Responsibilities

- Swift + SwiftUI setup
- SQLite database for local storage
- Custom sync engine with Supabase Realtime
- BGAppRefreshTask for periodic sync
- UI implementation (Home, Study screens)
- Design system implementation with light/dark/system theme
- Font bundling (Frank Ruhl Libre, Noto Sans Hebrew)
- Supabase Auth integration (Apple Sign-In, Google)
- All strings in Localizable.strings (no hardcoded strings)

## Dependencies

- **Receives tasks from**: Architect Agent
- **Consults**: Design System Agent (UI specs, shared strings), Sync Agent (Custom Sync), Backend Agent (API)
- **Coordinates with**: Client Testing Agent (Maestro tests)

## Technology Stack

| Component | Technology |
|-----------|------------|
| Language | Swift |
| UI Framework | SwiftUI |
| Local Database | SQLite |
| Sync | Custom Sync Engine + Supabase Realtime |
| Background Sync | BGAppRefreshTask |
| Authentication | Supabase Auth SDK |
| Dependency Management | Swift Package Manager |

## Critical Rules

### No Hardcoded Strings

**NEVER use hardcoded strings in code.** All user-facing text must be in `Localizable.strings`:

```swift
// BAD - Never do this
Text("סיימתי")
Text("האם למדת היום?")

// GOOD - SwiftUI automatically localizes string literals
Text("done_button")
Text("have_you_studied_today")

// For parameterized strings, use string interpolation
Text("streak_count \(count)")

// For non-SwiftUI contexts, use String(localized:)
let message = String(localized: "done_button", comment: "Done button")
```

**Note:** SwiftUI automatically treats string literals in `Text`, `Label`, `Button`, etc. as localization keys and looks them up in `Localizable.strings`. No need for `NSLocalizedString` or explicit localization methods.

String resources are generated from the shared master file. See `design-system.md` for the shared string resources system.

## Project Structure

```
ios/
├── HaLomeid/
│   ├── HaLomeidApp.swift
│   ├── ContentView.swift
│   ├── Info.plist
│   ├── Resources/
│   │   ├── Fonts/
│   │   │   ├── FrankRuhlLibre-Bold.ttf
│   │   │   └── NotoSansHebrew-Regular.ttf
│   │   └── he.lproj/
│   │       └── Localizable.strings
│   ├── Core/
│   │   ├── DI/
│   │   │   └── Dependencies.swift
│   │   └── Extensions/
│   │       └── Date+Extensions.swift
│   ├── Data/
│   │   ├── Local/
│   │   │   ├── Database.swift
│   │   │   └── Models/
│   │   ├── Sync/
│   │   │   ├── SyncEngine.swift
│   │   │   ├── InitialSync.swift
│   │   │   └── ContentGenerator.swift
│   │   ├── Remote/
│   │   │   └── SupabaseClient.swift
│   │   └── Repository/
│   │       ├── StudyRepository.swift
│   │       └── AuthRepository.swift
│   ├── Domain/
│   │   ├── Models/
│   │   │   ├── StudyUnit.swift
│   │   │   ├── Track.swift
│   │   │   └── ContentItem.swift
│   │   └── UseCases/
│   │       ├── GetTodayStudyUseCase.swift
│   │       └── CalculateStreakUseCase.swift
│   ├── UI/
│   │   ├── Theme/
│   │   │   ├── DesertOasisTheme.swift
│   │   │   ├── Colors.swift
│   │   │   └── Typography.swift
│   │   ├── Screens/
│   │   │   ├── Home/
│   │   │   │   ├── HomeView.swift
│   │   │   │   └── HomeViewModel.swift
│   │   │   ├── Study/
│   │   │   │   ├── StudyView.swift
│   │   │   │   └── StudyViewModel.swift
│   │   │   └── Auth/
│   │   │       ├── LoginView.swift
│   │   │       └── AuthViewModel.swift
│   │   └── Components/
│   │       ├── TrackCard.swift
│   │       ├── StreakIndicator.swift
│   │       └── DoneButton.swift
│   └── Background/
│       └── BackgroundSync.swift
├── HaLomeid.xcodeproj/
└── Package.swift
```

## Design System Implementation

### Theme Support (Light/Dark/System)

**Requirements:**
- Support light, dark, and system theme modes
- Use SwiftUI environment for color scheme
- Follow design system colors (see `design-system.md`)
- Default to system theme preference
- Allow user override via ThemeManager

**Implementation Pattern:**
- Create ThemeManager as ObservableObject with @AppStorage
- Use @Environment(\.colorScheme) to detect system preference
- Define color properties that switch based on colorScheme
- Apply colors via SwiftUI modifiers
swift
import SwiftUI

struct HalomeidTheme {
    @Environment(\.colorScheme) var colorScheme
    
    var primaryBackground: Color {
        colorScheme == .dark ? Color(hex: "121212") : Color(hex: "FEFAE0")
    }
    
    var secondaryBackground: Color {
        colorScheme == .dark ? Color(hex: "1E1E1E") : Color(hex: "E9EDC9")
    }
    
    var cardSurface: Color {
        colorScheme == .dark ? Color(hex: "2D2D2D") : Color(hex: "FAEDCD")
    }
    
    var textPrimary: Color {
        colorScheme == .dark ? Color(hex: "FEFAE0") : Color(hex: "1A1A1A")
    }
    
    // Accent stays the same in both themes
    static let accent = Color(hex: "D4A373")
    static let mutedAccent = Color(hex: "CCD5AE")
}

// Theme preference storage
class ThemeManager: ObservableObject {
    enum Theme: String {
        case light, dark, system
    }
    
    @AppStorage("selectedTheme") var selectedTheme: Theme = .system
    
    var colorScheme: ColorScheme? {
        switch selectedTheme {
        case .light: return .light
        case .dark: return .dark
        case .system: return nil
        }
    }
}
```

### Colors

**Requirements:**
- Define colors matching design system (see `design-system.md`)
- Support both light and dark themes
- Accent colors remain consistent across themes
- Use Color extension for hex initialization

**Color Tokens:**
- Primary Background (light: #FEFAE0, dark: #121212)
- Secondary Background (light: #E9EDC9, dark: #1E1E1E)
- Card Surface (light: #FAEDCD, dark: #2D2D2D)
- Accent (#D4A373 - same in both themes)
- Muted Accent (light: #CCD5AE, dark: #8A9A7A)
swift
import SwiftUI

extension Color {
    static let desertOasis = DesertOasisColors()
}

struct DesertOasisColors {
    // Light theme
    let primaryBackground = Color(hex: "FEFAE0")
    let secondaryBackground = Color(hex: "E9EDC9")
    let cardSurface = Color(hex: "FAEDCD")
    let accent = Color(hex: "D4A373")
    let mutedAccent = Color(hex: "CCD5AE")
    
    // Dark theme
    let darkBackground = Color(hex: "121212")
    let darkSurface = Color(hex: "2D2D2D")
}

extension Color {
    init(hex: String) {
        let scanner = Scanner(string: hex)
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        
        self.init(
            red: Double((rgbValue & 0xFF0000) >> 16) / 255.0,
            green: Double((rgbValue & 0x00FF00) >> 8) / 255.0,
            blue: Double(rgbValue & 0x0000FF) / 255.0
        )
    }
}
```

### Typography

**Requirements:**
- Bundle fonts locally (Frank Ruhl Libre Bold, Noto Sans Hebrew Regular)
- Define custom fonts using Font.custom()
- Use Frank Ruhl Libre for source text
- Use Noto Sans Hebrew for explanations and UI text

**Type Scale:**
- Headline Large: 24pt, Bold, Frank Ruhl Libre (source text)
- Headline Medium: 20pt, Bold, Frank Ruhl Libre (section headers)
- Body Large: 16pt, Regular, Noto Sans Hebrew (explanations)
- Body Medium: 14pt, Regular, Noto Sans Hebrew (UI text)
swift
import SwiftUI

extension Font {
    static let sourceText = Font.custom("FrankRuhlLibre-Bold", size: 24)
    static let explanationText = Font.custom("NotoSansHebrew-Regular", size: 16)
    static let uiText = Font.custom("NotoSansHebrew-Regular", size: 14)
}
```

### Font Registration (Info.plist)

```xml
<key>UIAppFonts</key>
<array>
    <string>FrankRuhlLibre-Bold.ttf</string>
    <string>NotoSansHebrew-Regular.ttf</string>
</array>
```

## String Resources

### Generated from Shared Master (Localizable.strings)

```strings
/* App */
"app_name" = "הלומד";

/* Buttons */
"done_button" = "סיימתי";
"done_completed" = "✓ סיימתי";
"continue_as_guest" = "המשך כאורח";
"sign_in_with_google" = "התחבר עם Google";
"sign_in_with_apple" = "התחבר עם Apple";
"retry" = "נסה שוב";

/* Home Screen */
"have_you_studied_today" = "האם למדת היום?";
"studied_today" = "למדת היום ✓";
"daily_mishna" = "משנה יומית";

/* Study Screen */
"summary_of_commentaries" = "סיכום פרשנויות";
"well_done" = "כל הכבוד!";
"todays_study_complete" = "הלימוד היומי הושלם";

/* Streak */
"streak_count" = "%d ימים רצופים";

/* Settings */
"settings" = "הגדרות";
"theme_light" = "בהיר";
"theme_dark" = "כהה";
"theme_system" = "לפי המערכת";

/* Errors */
"error_generic" = "אירעה שגיאה";
"offline_mode" = "מצב לא מקוון";
"syncing" = "מסנכרן...";
```

See `design-system.md` for the shared string resources system that generates these files.

## Screen Implementations

### App Entry with Theme

```swift
@main
struct HaLomeidApp: App {
    @StateObject private var themeManager = ThemeManager()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(themeManager.colorScheme)
                .environmentObject(themeManager)
        }
    }
}
```

### Home View

```swift
import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel = HomeViewModel()
    @Environment(\.colorScheme) var colorScheme
    
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(viewModel.tracks) { track in
                        NavigationLink(value: track) {
                            TrackCard(
                                track: track,
                                streak: viewModel.streaks[track.id] ?? 0,
                                hasStudiedToday: viewModel.completedToday.contains(track.id)
                            )
                        }
                    }
                }
                .padding()
            }
            .background(colorScheme == .dark ? Color(hex: "1E1E1E") : Color.desertOasis.secondaryBackground)
            .navigationDestination(for: Track.self) { track in
                StudyView(trackId: track.id)
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}
```

### Done Button

```swift
import SwiftUI

struct DoneButton: View {
    let isCompleted: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: {
            let impact = UIImpactFeedbackGenerator(style: .medium)
            impact.impactOccurred()
            action()
        }) {
            HStack {
                if isCompleted {
                    Image(systemName: "checkmark")
                }
                Text(
                    isCompleted ? "done_completed" : "done_button",
                    comment: ""
                ))
                .font(.explanationText)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.desertOasis.accent)
            .foregroundColor(.white)
            .cornerRadius(12)
        }
        .padding()
    }
}
```

## SQLite Database Integration

### Setup (Database.swift)

```swift
import SQLite

class Database {
    static let shared = Database()
    
    private let db: Connection
    
    private init() {
        let path = NSSearchPathForDirectoriesInDomains(
            .documentDirectory, .userDomainMask, true
        ).first!
        
        db = try! Connection("\(path)/halomeid.db")
        
        // Create tables
        try! createTables()
    }
    
    private func createTables() throws {
        // user_study_log table
        try db.run(userStudyLog.create { t in
            t.column(id, primaryKey: true)
            t.column(userId)
            t.column(trackId)
            t.column(studyDate)
            t.column(contentId)
            t.column(isCompleted)
            t.column(completedAt)
            t.column(updatedAt)
            t.column(deleted)
        })
        
        // Similar for content_cache and tracks...
    }
}
```

## Custom Sync Integration

### Sync Engine Setup

**Files:**
- `Data/Sync/SyncEngine.swift` - Main sync orchestration
- `Data/Sync/InitialSync.swift` - Initial data download with 14-day window
- `Data/Sync/IncrementalSync.swift` - Incremental updates via Realtime
- `Data/Sync/ContentGenerator.swift` - Content generation during sync

**Sync Flow:**
1. Generate schedule (ensure content exists)
2. Sync user_study_log within 14-day window
3. Sync referenced content_cache
4. Sync tracks (all)
5. Generate quizzes for content in window
6. Clean up old data outside window

## Background Sync (BGAppRefreshTask)

### Setup (BackgroundSync.swift)

```swift
import BackgroundTasks

class BackgroundSync {
    static let taskIdentifier = "com.halomeid.sync"
    
    static func register() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: taskIdentifier,
            using: nil
        ) { task in
            handleSync(task: task as! BGAppRefreshTask)
        }
    }
    
    static func schedule() {
        let request = BGAppRefreshTaskRequest(identifier: taskIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        
        try? BGTaskScheduler.shared.submit(request)
    }
    
    private static func handleSync(task: BGAppRefreshTask) {
        schedule()
        
        let syncTask = Task {
            do {
                let syncEngine = SyncEngine.shared
                try await syncEngine.sync()
                task.setTaskCompleted(success: true)
            } catch {
                task.setTaskCompleted(success: false)
            }
        }
        
        task.expirationHandler = {
            syncTask.cancel()
        }
    }
}
```

## Key Dependencies (Package.swift)

```swift
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "HaLomeid",
    platforms: [.iOS(.v16)],
    dependencies: [
        .package(url: "https://github.com/powersync-ja/powersync-swift.git", from: "0.x.x"),
        .package(url: "https://github.com/supabase/supabase-swift.git", from: "2.x.x"),
    ],
    targets: [
        .target(
            name: "HaLomeid",
            dependencies: [
                .product(name: "PowerSync", package: "powersync-swift"),
                .product(name: "Supabase", package: "supabase-swift"),
            ]
        ),
    ]
)
```

## RTL Support

Hebrew is RTL:

```swift
.environment(\.layoutDirection, .rightToLeft)
.multilineTextAlignment(.trailing)
.flipsForRightToLeftLayoutDirection(true)
```

## Testing

See `client-testing.md` for Maestro E2E tests covering:
- Home screen display
- Study screen navigation
- Completion marking
- Streak display
- Offline behavior
- Apple Sign-In flow
- Theme switching (light/dark)

## Reference Documents

- **TDD Section 10.2**: iOS implementation
- **TDD Section 3**: Design System
- **PRD Section 6**: User Experience
- **PRD Section 7**: Core App Flow
- **design-system.md**: Shared string resources, theming
