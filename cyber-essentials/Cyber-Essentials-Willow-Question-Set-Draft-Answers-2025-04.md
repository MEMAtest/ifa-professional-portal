# Cyber Essentials Question Set (Willow) – Draft Answers (April 2025)

This is a working document to help complete the IASME Cyber Essentials questionnaire using evidence we can extract from the `ifa-platform` workspace plus a small set of confirmations from you.

## Evidence already identified (from this workspace)

### Cloud services used by the IFA platform (third party)
Source: `Documents/ifa-professional-portal/ifa-platform/.env.local` (variable names only) and `Documents/ifa-professional-portal/ifa-platform/.env.example`

- Supabase (database/auth platform)
- GitHub (source code hosting)
- Resend (email delivery)
- OpenSign (document signing)
- Ordnance Survey (address lookup API)
- DeepSeek (AI API)
- Alpha Vantage (financial data API)

### Hosting / deployment (needs confirmation)
Source: `Documents/ifa-professional-portal/ifa-platform/.vercelignore`

- Likely Vercel for hosting/deployment (confirm)

### Local device spot-check (only applies if this Mac is in-scope)
Source: local commands

- macOS `26.1` (Build `25B78`)
- Automatic update checks: enabled
- macOS Application Firewall: **disabled** on this device (needs remediation if in-scope)

## Open items we need from you (to answer accurately)

1) **Organisation details**: legal name, org type, registration number (or “none”), registered address, website.
2) **Scope choice**: whole organisation vs subset; locations in scope; headcount and remote workers count.
3) **Device inventory (in scope)**:
   - Laptops/desktops/virtual desktops: quantity + make + OS edition/version (Windows feature version required).
   - Thin clients (if any): quantity + make + OS version.
   - Servers/virtual servers/hypervisors/VDI (if any): quantity + OS/version.
   - Mobiles/tablets: quantity + make + OS version.
4) **Networks & boundary equipment**:
   - Network names/locations/purpose (office LAN, guest Wi‑Fi, admin, dev, etc).
   - Firewall/router make + model (and whether remote admin is enabled).
5) **Cloud services list (in addition to the platform)**:
   - Email/collaboration (e.g., Microsoft 365 / Google Workspace), password manager, MDM (Intune/Jamf), DNS/CDN (Cloudflare), repo hosting (GitHub), accounting/CRM, etc.
6) **Operational controls**:
   - MFA enforced for all users/admins on all cloud services.
   - Password policy approach (min length / deny list / passwordless / MFA).
   - Patch/update process and evidence that high/critical updates land within 14 days.
   - Malware protection approach on Windows/macOS + application allow‑listing/MDM controls.
   - Joiner/mover/leaver process (account creation approval, leaver disablement, admin account separation).

---

# Draft answers (fill/confirm)

## A1 – Organisation

### A1.1 Organisation name
- Answer: **TBC**

### A1.2 Organisation type
- Answer: **TBC** (LTD/LLP/CIC/…)

### A1.3 Registration number
- Answer: **TBC** (or “none” if applicable)

### A1.4 Registered address
- Answer: **TBC**

### A1.5 Main business
- Answer: **TBC** (likely `IT` / `Managed Services - IT Managed Services` / `Other`)

### A1.6 Website address
- Answer: **TBC**
- Possible clue (needs confirmation): `https://plannetic.com` from `Documents/ifa-professional-portal/ifa-platform/package.json`

### A1.7 Renewal or first time
- Answer: **TBC** (Renewal / First Time Application)

### A1.8 Two main reasons
- Primary: **TBC**
- Secondary: **TBC**
- If one is contract/regulator/grant/other: fill A1.8.1–A1.8.5

### A1.9 Read “Cyber Essentials Requirements for IT Infrastructure”?
- Answer: **TBC** (Yes/No)

### A1.10 IASME breach contact permission
- Answer: **TBC** (Yes/No)

### A1.11 IASME research contact permission
- Answer: **TBC** (Yes/No)

## A2 – Scope of assessment

### A2.1 Whole organisation in scope?
- Answer: **TBC** (Yes/No)

### A2.2 Scope statement (only if A2.1 = No)
- Answer: **TBC**

### A2.3 Locations in scope
- Answer: **TBC**

### A2.4 Laptops/desktops/virtual desktops (qty + make + OS version)
- Answer (known so far): `1 x` Apple Mac laptop running macOS `26.1` (Build `25B78`) *(add any other in-scope laptops/desktops/VDI here)*

### A2.4.1 Thin clients (qty + make + OS version)
- Answer: **TBC** (use “None” if none)

### A2.5 Servers/virtual servers/hypervisors/VDI (qty + OS version)
- Answer: **TBC** (use “None” if none)

### A2.6 Tablets and mobiles (qty + make + OS version)
- Answer: **TBC**

### A2.7 Networks in scope (name + location + purpose)
- Answer: **TBC**

### A2.7.1 Remote workers count
- Answer: **TBC**

### A2.8 Network equipment in scope (firewalls/routers – make + model)
- Answer: **TBC**

### A2.9 Cloud services (third party)
- Answer (known from platform repo):
  - Supabase
  - GitHub
  - Resend
  - OpenSign
  - Ordnance Survey
  - DeepSeek
  - Alpha Vantage
- Additional cloud services used by the organisation: **TBC**
- Hosting/deploy provider for the platform (likely Vercel): **TBC**

### A2.10 Person responsible for managing IT in scope (name + role)
- Answer: **TBC**

## A3 – Insurance

### A3.1 UK/Crown Dependencies HQ and turnover < £20m?
- Answer: **TBC** (Yes/No)

### A3.2 Opt out of included insurance? (only if A3.1 = Yes)
- Answer: **TBC** (Opt in / Opt out)

### A3.3 Insurance contact email (only if not opted out)
- Answer: **TBC**

## A4 – Firewalls

### A4.1 Firewalls at internet boundaries?
- Answer: **TBC** (Yes/No)

### A4.1.1 Software firewalls enabled on all computers/laptops/servers?
- Answer: **Yes** *(once enabled on this Mac and any other in-scope endpoints)*
- Copy/paste notes: Built-in host firewalls are enabled and kept enabled at all times, including when devices are used on untrusted networks (e.g., home/public Wi‑Fi). For macOS devices we use the built-in macOS Application Firewall.

### A4.1.2 If A4.1.1 = No due to OS default: list OS
- Answer: **TBC** (only if applicable)

### A4.2 Default admin passwords changed on boundary firewall devices?
- Answer: **TBC** (Yes/No)

### A4.2.1 Process for changing firewall password
- Answer: **TBC**

### A4.3 Firewall password configuration option (A–E)
- Answer: **TBC**

### A4.4 Change firewall password on compromise?
- Answer: **TBC** (Yes/No)

### A4.5 Process to manage firewall (business case for inbound rules)?
- Answer: **TBC** (Yes/No)

### A4.6 Firewall rules reviewed in last 12 months (describe)
- Answer: **TBC**

### A4.7 Firewall allows unauthenticated inbound connections?
- Answer: **TBC** (Yes/No)

### A4.8 How inbound connections are approved & documented
- Answer: **TBC**

### A4.9 Firewall admin interface accessible from internet?
- Answer: **TBC** (Yes/No)

### A4.10 If A4.9 = Yes: documented business requirement?
- Answer: **TBC**

### A4.11 If A4.9 = Yes: MFA or IP allow list + managed password?
- Answer: **TBC**

## A5 – Secure configuration

### A5.1 Remove/disable unnecessary software/services (describe)
- Answer: **TBC**

### A5.2 Only necessary user accounts exist?
- Answer: **TBC** (Yes/No)

### A5.3 Default/guessable passwords changed?
- Answer: **TBC** (Yes/No)

### A5.4 Do you run/host external services that provide access to non-public data across the internet?
- Answer: **TBC** (Yes/No)
- Note: if the IFA platform is a production web app used by staff/customers over the internet, this will likely be “Yes” and needs careful completion.

### A5.5 If A5.4 = Yes: authentication option used (A–E)
- Answer: **TBC**

### A5.6 If A5.4 uses passwords: process to change on compromise
- Answer: **TBC**

### A5.7 If A5.4 = Yes and not MFA: brute force protection option (A–C)
- Answer: **TBC**

### A5.8 Auto-run/auto-execute disabled?
- Answer: **TBC** (Yes/No)

### A5.9 Device locking enabled where user has device in hand?
- Answer: **TBC** (Yes/No)

### A5.10 If A5.9 = Yes: device unlock method(s)
- Answer: **TBC**

## A6 – Security update management

### A6.1 All operating systems supported and receiving security updates?
- Answer: **TBC** (Yes/No)

### A6.2 All software supported and receiving vulnerability fixes?
- Answer: **TBC** (Yes/No)

### A6.2.1 Browsers (name + version)
- Answer: **TBC**
- Local device spot-check (only if this Mac is in-scope):
  - Google Chrome `143.0.7499.110`
  - Firefox `146.0`
  - Microsoft Edge `143.0.3650.80`
  - Safari `26.1`

### A6.2.2 Malware protection software (name + version)
- Answer: **TBC**

### A6.2.3 Email applications (name + version)
- Answer: **TBC**
- Local device spot-check (only if this Mac is in-scope):
  - Apple Mail `16.0`

### A6.2.4 Office applications (name + version)
- Answer: **TBC**
- Local device spot-check (only if this Mac is in-scope):
  - Apple Pages `14.4`
  - Apple Numbers `14.4`
  - Apple Keynote `14.4`
  - Microsoft OneNote `16.104`

### A6.3 Any unlicensed/unsupported software or cloud services?
- Answer: **TBC** (Yes/No)

### A6.3.1 If A6.3 = Yes: list unsupported/unlicensed
- Answer: **TBC**

### A6.4 High/critical OS + firewall/router firmware updates installed within 14 days?
- Answer: **TBC** (Yes/No)

### A6.4.1 OS updates applied via auto-updates?
- Answer: **TBC** (Yes/No)

### A6.4.2 If not auto-updates: how ensure updates within 14 days
- Answer: **TBC**

### A6.5 High/critical application updates installed within 14 days?
- Answer: **TBC** (Yes/No)

### A6.5.1 App updates applied via auto-updates?
- Answer: **TBC** (Yes/No)

### A6.5.2 If not auto-updates: how ensure updates within 14 days
- Answer: **TBC**

### A6.6 Remove unsupported software when EOL?
- Answer: **TBC** (Yes/No)

### A6.7 If unsupported software needed: moved out of scope with no internet (explain)
- Answer: **TBC** (or “Not applicable – no unsupported software used”)

## A7 – User access control

### A7.1 User account creation approval process (describe)
- Answer: **TBC**

### A7.2 Unique credentials for all user/admin accounts (no sharing)?
- Answer: **TBC** (Yes/No)

### A7.3 Leaver process (disable/delete accounts) (describe)
- Answer: **TBC**

### A7.4 Least privilege process (describe)
- Answer: **TBC**

### A7.5 Admin access granting process (describe)
- Answer: **TBC**

### A7.6 Separate admin accounts for admin tasks (describe)
- Answer: **TBC**

### A7.7 Prevent admin accounts used for web/email (describe)
- Answer: **TBC**

### A7.8 Track who has admin accounts?
- Answer: **TBC** (Yes/No)

### A7.9 Review admin access regularly?
- Answer: **TBC** (Yes/No)

### A7.10 Brute-force protection for password systems (describe)
- Answer: **TBC**

### A7.11 Technical controls for password quality (describe)
- Answer: **TBC**

### A7.12 How you support unique/strong passwords (describe)
- Answer: **TBC**

### A7.13 Compromised password/account process?
- Answer: **TBC** (Yes/No)

### A7.14 Do all cloud services have MFA available?
- Answer: **TBC** (Yes/No)

### A7.15 If A7.14 = No: list cloud services without MFA option
- Answer: **TBC**

### A7.16 MFA applied to all cloud service administrators?
- Answer: **TBC** (Yes/No)

### A7.17 MFA applied to all cloud service users?
- Answer: **TBC** (Yes/No)

## A8 – Malware protection

### A8.1 Malware protection method(s) used (A/B/C)
- Answer: **TBC**

### A8.2 If A8.1 Option A: anti-malware updates + blocks malware?
- Answer: **TBC** (Yes/No)

### A8.3 If A8.1 Option A: scans web pages / warns on malicious sites?
- Answer: **TBC** (Yes/No)

### A8.4 If A8.1 Option B: users restricted from installing unsigned apps?
- Answer: **TBC** (Yes/No)

### A8.5 If A8.1 Option B: only approved apps installed + approved list maintained?
- Answer: **TBC** (Yes/No)
