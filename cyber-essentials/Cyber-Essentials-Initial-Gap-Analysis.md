# Cyber Essentials – Initial Gap Analysis (Workspace-Based)

This is an initial, evidence-led gap analysis based on what we can see in the local `ifa-platform` workspace and a quick spot-check of the current Mac. It is **not** a complete Cyber Essentials assessment until the “unknown” items below are confirmed for the full in-scope estate.

## Confirmed / evidenced items

### In-scope cloud services (platform-related)
Source: `Documents/ifa-professional-portal/ifa-platform/.env.local` (keys only) and `Documents/ifa-professional-portal/ifa-platform/.env.example`

- Supabase
- GitHub (source code hosting)
- Resend
- OpenSign
- Ordnance Survey
- DeepSeek
- Alpha Vantage

### Local device spot-check (only relevant if this device is in-scope)
Source: local commands

- macOS `26.1` (Build `25B78`)
- Automatic update checks enabled
- **Host firewall disabled** on this device (macOS Application Firewall)

## Confirmed gaps / non-compliance risks

1) **Host firewall disabled on a Mac**: Cyber Essentials requires every in-scope device to be protected by a correctly configured firewall. If this Mac is used for organisational work and is in-scope, the host firewall must be enabled and kept enabled.
   - Remediation: `System Settings → Network → Firewall → On` (macOS Application Firewall)

## Unknowns (need confirmation/evidence)

These are the items that typically determine pass/fail and can’t be inferred from the application codebase alone:

- **Scope & inventory**: full device list (qty + make + OS version), all networks in use, remote workers count.
- **Boundary firewall(s)**: make/model, default admin password changed, remote admin exposure, inbound rules posture (deny by default), rules review cadence.
- **Patch management**:
  - OS + firmware: high/critical updates within 14 days across all endpoints + routers/firewalls.
  - Applications: high/critical updates within 14 days across browsers, office apps, email apps, etc.
- **User access control**:
  - joiner/mover/leaver process (disable accounts promptly),
  - least privilege,
  - separate admin accounts and prevention of day-to-day use of admin accounts.
- **MFA coverage for cloud services**: must be enabled “where available” for **all users and admins** across all in-scope cloud services.
- **Malware protection**: anti-malware and/or application allow-listing controls across Windows/macOS/mobile, plus configuration to update and block threats.

## Evidence to collect (minimum viable)

- A single **asset inventory** export/list (even a spreadsheet) covering A2.4–A2.6.
- Firewall/router list with make+model + confirmation of admin access method (LAN only / VPN / MFA).
- Screenshot or admin export showing **MFA enforced** for each cloud service (or via a central IdP).
- Screenshot or MDM report showing **auto-updates** / patch compliance.
- Endpoint security report showing malware protection status for Windows/macOS devices.
- Written joiner/mover/leaver + admin access process (can be lightweight, but must reflect reality).

## Immediate next actions (practical)

- Decide and document **scope** (whole org is simplest unless you truly have segregated out-of-scope networks with no internet access).
- Produce the **device inventory** (A2.4–A2.6) with OS versions.
- For any Mac/Windows device in scope: ensure **host firewall is enabled**.
- Ensure **MFA is enabled for all users/admins** on: Supabase, Vercel (if used), Resend, OpenSign, Ordnance Survey portals, DeepSeek/AI portal, Alpha Vantage portal, GitHub (if used), email/collaboration suite (Microsoft 365/Google Workspace), password manager, DNS provider, etc.
