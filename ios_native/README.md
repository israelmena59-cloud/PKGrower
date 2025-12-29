# PKGrower iOS Native Wrapper

This directory contains the Swift source files to build a native iOS application wrapper for the PKGrower web app.

## Setup Instructions

1. **Create a New Xcode Project**:
   - Open Xcode.
   - Select **Create a new Xcode project**.
   - Choose **iOS** -> **App**.
   - Name the project `PKGrower`.
   - Ensure Interface is set to **SwiftUI** and Language is **Swift**.
   - Save the project in a convenient location (you can even save it inside this `ios_native` folder if you wish, but Xcode creates its own folder structure).

2. **Add Files**:
   - Locate the `Classes` folder in this directory (`ios_native/Classes`).
   - Drag and drop the Swift files (`Config.swift`, `WebView.swift`, `ContentView.swift`, `PKGrowerApp.swift`) into your new Xcode project's file navigator.
   - Make sure "Copy items if needed" is checked.
   - **Important**: Delete the default `ContentView.swift` and `PKGrowerApp.swift` created by Xcode to avoid conflicts, or just replace their contents with the provided files.

3. **Configure URL**:
   - Open `Config.swift`.
   - Set `useLocalFunc` to `true` for development (requires your local dev server running).
   - Set `useLocalFunc` to `false` for production.
   - Update `localURL` and `productionURL` if necessary.

4. **Permissions (Optional)**:
   - If your web app uses Camera or Location, you will need to add keys to `Info.plist` in Xcode (e.g., `Privacy - Camera Usage Description`).

5. **Run**:
   - Select a simulator or your connected iPhone.
   - Press **Cmd+R** to run.

## Requirements

- Xcode 14.0+
- iOS 16.0+
