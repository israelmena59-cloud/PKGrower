---
description: Deploy PKGrower to Firebase Hosting
---

# Firebase Hosting Deployment

 This workflow helps you deploy the PKGrower frontend to Firebase Hosting.

 ## Prerequisites
 - You must have a Google/Firebase account.
 - You must have created a project in the [Firebase Console](https://console.firebase.google.com/).

 ## Steps

 1. **Install Firebase Tools**
    Installs the CLI globally.

    ```powershell
    // turbo
    npm install -g firebase-tools
    ```

 2. **Login to Firebase**
    Opens a browser to authenticate.

    ```powershell
    firebase login
    ```

 3. **Initialize Hosting**
    Run this command in the project root.
    - Select **Hosting: Configure files for Firebase Hosting**.
    - Select **Use an existing project** (choose the one you created).
    - Public directory: `dist` (Vite's default output).
    - Configure as a single-page app (rewrites to /index.html)?: **Yes**.
    - Set up automatic builds and deploys with GitHub?: **No** (for now).

    ```powershell
    firebase init hosting
    ```

 4. **Create Production Build with Environment Variable**
    **CRITICAL**: You must inject your Cloudflare Tunnel URL here during the build.
    Replace `YOUR_TUNNEL_URL` with the URL you got from `/deploy_tunnel` (e.g., `https://foo.trycloudflare.com`).

    ```powershell
    # Example:
    # $env:VITE_API_URL="https://your-tunnel-url.trycloudflare.com"; npm run build

    # Run this (replace the URL first!):
    $env:VITE_API_URL="[INSERT_YOUR_TUNNEL_URL_HERE]"; npm run build
    ```

 5. **Deploy**
    Uploads the `dist` folder to Firebase.

    ```powershell
    firebase deploy --only hosting
    ```
