# Manual Binary Assets

The repository intentionally excludes every binary image required for packaging the PWA and the native iOS shell. Use the following checklist to recreate them locally before running the build or opening the Xcode workspace.

## PWA / Web Distribution (`public/icons/`)
| File path | Purpose | Specs |
| --- | --- | --- |
| `public/icons/icon-192.png` | Standard 192×192 favicon referenced by `manifest.json` for Android/desktop install prompts. | PNG, 192×192, opaque background. |
| `public/icons/icon-512.png` | High-res PWA icon for Chrome/Edge stores and splash screens. | PNG, 512×512, opaque background. |
| `public/icons/icon-maskable-512.png` | Maskable icon so Android launchers can crop safely. | PNG, 512×512, include 20% padding around key artwork, set `purpose: "maskable"`. |
| `public/icons/apple-touch-icon-180.png` | Touch icon iOS Safari uses when the PWA is saved to the home screen. | PNG, 180×180, no transparency per Apple’s guidance. |
| `public/icons/app-store-icon-1024.png` | Square icon that App Store Connect expects during upload (also used by Vite for the native bundle metadata). | PNG, 1024×1024, no rounded corners, no transparency.

> **Folder requirement:** keep `public/icons/` in place (already tracked). Add the PNG files above before bundling.

## Native iOS Shell (`ios/App/App/Assets.xcassets/`)
| File path | Purpose | Specs |
| --- | --- | --- |
| `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` | Primary App Icon consumed by the Xcode asset catalog. | PNG, 1024×1024, same artwork as the App Store icon, transparency allowed but avoid rounded corners. |
| `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png` | Universal launch screen base image (3×). | PNG, 2732×2732, centered artwork with ample safe area padding. |
| `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png` | Launch screen @2× variant. | PNG, 2732×2732 (downscaled to 2× by Xcode), same design as 3× file. |
| `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png` | Launch screen @1× variant. | PNG, 2732×2732 (downscaled to 1× by Xcode), same design as above. |

> **Folder requirement:** keep the existing asset catalog directories (`AppIcon.appiconset` and `Splash.imageset`). Drop the PNGs into those folders so that the `Contents.json` references line up.

## Suggested Workflow
1. Recreate the artwork in your design tool of choice.
2. Export the PNGs exactly with the filenames listed above.
3. Place them into the specified folders.
4. Re-run `npm run build && npx cap sync ios` to bake the assets into the native bundle.

