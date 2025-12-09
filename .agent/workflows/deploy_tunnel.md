---
description: Setup Cloudflare Tunnel for PKGrower
---

# Cloudflare Tunnel Setup

This workflow installs `cloudflared` to expose your local backend securely to the internet.

1. **Download cloudflared** (Windows)
   Running this command will download the executable.

   ```powershell
   // turbo
   Invoke-WebRequest -Uri https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -OutFile cloudflared.exe
   ```

2. **Login to Cloudflare**
   You need a Cloudflare account. This command opens a browser to link this machine.
   *Action Required*: Login and select your domain (or a free Cloudflare Quick Tunnel if you don't have a domain yet).

   ```powershell
   .\cloudflared.exe tunnel login
   ```

3. **Create Tunnel**
   Creates a named tunnel called "pkgrower-tunnel".

   ```powershell
   .\cloudflared.exe tunnel create pkgrower-tunnel
   ```

4. **Configure Tunnel**
   Route traffic from the tunnel to your local backend port (3000).

   ```powershell
   .\cloudflared.exe tunnel route dns pkgrower-tunnel pkgrower.yourdomain.com
   ```
   *(Note: Replace `pkgrower.yourdomain.com` with your desired domain if you have one. If using Quick Tunnel, use `tunnel --url localhost:3000`)*

5. **Start Tunnel** (Quick Mode - Recommended for Testing)
   If you don't have a domain configured yet, use this Quick Tunnel command. It will give you a temporary `https://....trycloudflare.com` URL.

   ```powershell
   .\cloudflared.exe tunnel --url http://localhost:3000
   ```
