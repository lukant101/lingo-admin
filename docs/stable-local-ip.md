# Stable Local IP for Development

When accessing the Expo dev server from a local IP (e.g., `192.168.40.147:8081`) instead of `localhost:8081`, the IP may change and break CORS whitelisting in the CDN and API service.

## Option 1: DHCP Reservation on Router (Recommended)

1. Find your Mac's MAC address: **System Settings > Network > Wi-Fi > Details > Hardware**
2. Log into your router admin panel
3. Find DHCP reservation / static lease settings
4. Map your MAC address to a fixed IP (e.g., `192.168.40.147`)

Your Mac will always receive the same IP via DHCP.

## Option 2: Static IP via macOS

1. **System Settings > Network > Wi-Fi > Details > TCP/IP**
2. Change "Configure IPv4" from "Using DHCP" to "Manually"
3. Set:
   - IP Address: `192.168.40.147`
   - Subnet Mask: `255.255.255.0`
   - Router: your gateway (e.g., `192.168.40.1`)
4. Pick an IP **outside** your router's DHCP range to avoid conflicts

## Option 3: Use `.local` Hostname

macOS advertises itself via Bonjour/mDNS. Access the dev server at:

```
http://<your-mac-name>.local:8081
```

Find your hostname:

```bash
scutil --get LocalHostName
```

CORS config would need to whitelist this hostname instead of an IP.

## After Setting a Static Address

Add the new origin (e.g., `http://192.168.40.147:8081`) to CORS allowed origins in:

1. **API service** - CORS settings for the backend
2. **Cloud Storage bucket** `cdn.lingohouse.app` - CORS configuration for the CDN
