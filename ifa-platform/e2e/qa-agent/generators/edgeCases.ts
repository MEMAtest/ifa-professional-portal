/**
 * OSO QA Agent - Edge Case Generator
 * Generates boundary values and edge cases for all field types
 */

export const EdgeCases = {
  // ============================================
  // STRING EDGE CASES
  // ============================================
  strings: {
    empty: '',
    whitespace: '   ',
    singleChar: 'a',
    maxLength: 'a'.repeat(10000),
    unicode: '\u0000\u0001\u0002',
    rtlText: '\u202Eevil\u202C',
    emoji: '🚀💰📊👴👵',
    zalgo: 'Ť̸̢̧̛̛̮̼̺̟͎̗̭̫̦̺͕̯͎̘̫͙̺̮̦̼̣͙̣̣̫̜̦͙̮̮̫̺̦̺͚̗̙̗e̸̢s̸̢t̸̢',
    newlines: 'line1\nline2\rline3\r\nline4',
    tabs: 'col1\tcol2\tcol3',
    nullChar: 'test\0null',
    specialChars: '!@#$%^&*(){}[]|\\:";\'<>,.?/',
    quotes: `"double" 'single' \`backtick\``,
    backslash: 'path\\to\\file',
    htmlTags: '<div onclick="alert(1)">test</div>',
    scriptTag: '<script>alert("XSS")</script>',
    sqlInjection: "'; DROP TABLE users; --",
    ldapInjection: '*)(uid=*))(|(uid=*',
    pathTraversal: '../../../etc/passwd',
    commandInjection: '; rm -rf /',
    jsonPayload: '{"__proto__": {"polluted": true}}',
    xmlPayload: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
    oversizedJson: JSON.stringify({ data: 'x'.repeat(100000) }),
  },

  // ============================================
  // NUMBER EDGE CASES
  // ============================================
  numbers: {
    zero: 0,
    negative: -1,
    negativeDecimal: -0.01,
    veryNegative: -999999999,
    maxInt: Number.MAX_SAFE_INTEGER,
    minInt: Number.MIN_SAFE_INTEGER,
    infinity: Infinity,
    negInfinity: -Infinity,
    nan: NaN,
    decimal: 0.1 + 0.2, // Famous floating point issue
    scientific: 1e10,
    negScientific: -1e10,
    verySmall: 0.0000001,
    currency: 99999999.99,
    percentage: {
      below: -1,
      zero: 0,
      valid: 50,
      hundred: 100,
      above: 101,
      wayAbove: 1000,
    },
  },

  // ============================================
  // DATE EDGE CASES
  // ============================================
  dates: {
    epoch: '1970-01-01',
    y2k: '2000-01-01',
    future: '2099-12-31',
    farFuture: '9999-12-31',
    past: '1900-01-01',
    invalid: '2024-13-45',
    leapYear: '2024-02-29',
    notLeapYear: '2023-02-29',
    endOfMonth: '2024-01-31',
    today: new Date().toISOString().split('T')[0],
    // Age boundaries
    minorAge: getDateYearsAgo(17),
    adultAge: getDateYearsAgo(18),
    retirementAge: getDateYearsAgo(65),
    elderlyAge: getDateYearsAgo(75),
    veryOld: getDateYearsAgo(120),
    futureDate: getDateYearsAgo(-1),
  },

  // ============================================
  // EMAIL EDGE CASES
  // ============================================
  emails: {
    valid: 'test@example.com',
    withPlus: 'test+tag@example.com',
    withDots: 'test.user.name@example.com',
    subdomain: 'test@mail.example.com',
    longLocal: 'a'.repeat(64) + '@example.com',
    longDomain: 'test@' + 'a'.repeat(63) + '.com',
    noAt: 'testexample.com',
    multipleAt: 'test@@example.com',
    noDomain: 'test@',
    noLocal: '@example.com',
    spacesIn: 'test @example.com',
    specialChars: 'test!#$%&*@example.com',
    unicode: 'tëst@example.com',
    ipDomain: 'test@[127.0.0.1]',
    quotedLocal: '"test user"@example.com',
  },

  // ============================================
  // PHONE NUMBER EDGE CASES
  // ============================================
  phones: {
    ukMobile: '07123456789',
    ukLandline: '02012345678',
    withSpaces: '07123 456 789',
    withDashes: '07123-456-789',
    international: '+447123456789',
    tooShort: '0712',
    tooLong: '071234567890123456789',
    letters: 'not-a-phone',
    mixed: '07abc123def',
  },

  // ============================================
  // NATIONAL INSURANCE EDGE CASES
  // ============================================
  niNumbers: {
    valid: 'AB123456C',
    lowercase: 'ab123456c',
    withSpaces: 'AB 12 34 56 C',
    tooShort: 'AB12345',
    tooLong: 'AB1234567C',
    invalidPrefix: 'DA123456C', // D, F, I, Q, U, V start not allowed
    invalidSuffix: 'AB123456E', // Only A, B, C, D allowed
    allNumbers: '123456789',
    allLetters: 'ABCDEFGHI',
  },

  // ============================================
  // FINANCIAL EDGE CASES
  // ============================================
  financial: {
    amounts: {
      zero: 0,
      penny: 0.01,
      pound: 1,
      hundred: 100,
      thousand: 1000,
      tenThousand: 10000,
      hundredThousand: 100000,
      million: 1000000,
      tenMillion: 10000000,
      billion: 1000000000,
      negative: -1000,
      decimal: 1234.56,
      manyDecimals: 1234.5678,
    },
    percentages: {
      zero: 0,
      quarter: 25,
      half: 50,
      threeQuarters: 75,
      full: 100,
      over: 150,
      negative: -10,
    },
    riskLevels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '0', '11', '-1', 'high', 'low'],
  },
}

// Helper function to get date N years ago
function getDateYearsAgo(years: number): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() - years)
  return date.toISOString().split('T')[0]
}

// ============================================
// BOUNDARY VALUE GENERATOR
// ============================================
export function generateBoundaryValues(min: number, max: number): number[] {
  return [
    min - 1,        // Below minimum
    min,            // At minimum
    min + 1,        // Just above minimum
    Math.floor((min + max) / 2), // Middle
    max - 1,        // Just below maximum
    max,            // At maximum
    max + 1,        // Above maximum
  ]
}

// ============================================
// FIELD-SPECIFIC EDGE CASES
// Field IDs must match actual form from src/config/suitability/sections/
// ============================================
export const FieldEdgeCases: Record<string, unknown[]> = {
  // Personal Information (personal_information section)
  client_name: [
    EdgeCases.strings.empty,
    EdgeCases.strings.singleChar,
    EdgeCases.strings.maxLength.slice(0, 100),
    'O\'Brien Smith',
    'Mary-Jane Thompson',
    'José García',
    'François Müller',
    '李明',
    EdgeCases.strings.emoji,
    EdgeCases.strings.scriptTag,
  ],
  date_of_birth: Object.values(EdgeCases.dates),
  ni_number: Object.values(EdgeCases.niNumbers),
  occupation: [
    EdgeCases.strings.empty,
    'Software Engineer',
    'Company Director',
    EdgeCases.strings.maxLength.slice(0, 100),
    EdgeCases.strings.scriptTag,
  ],

  // Contact Details (contact_details section)
  email: Object.values(EdgeCases.emails),
  phone: Object.values(EdgeCases.phones),
  address: [
    EdgeCases.strings.empty,
    '123 High Street, London',
    'Flat 1/2, 45 Oak Avenue, Manchester, Greater Manchester',
    EdgeCases.strings.maxLength.slice(0, 200),
    EdgeCases.strings.scriptTag,
    EdgeCases.strings.specialChars,
  ],
  postcode: [
    EdgeCases.strings.empty,
    'SW1A 1AA',
    'EC1A 1BB',
    'M1 1AA',
    'invalid',
    'toolongpostcode',
    EdgeCases.strings.scriptTag,
  ],

  // Financial Situation (financial_situation section)
  annual_income: [...generateBoundaryValues(0, 1000000), ...Object.values(EdgeCases.numbers)].filter(n => typeof n === 'number'),
  monthly_expenses: [...generateBoundaryValues(0, 100000), ...Object.values(EdgeCases.numbers)].filter(n => typeof n === 'number'),
  property_value: [...generateBoundaryValues(0, 10000000)],
  mortgage_outstanding: [...generateBoundaryValues(0, 10000000)],
  savings: [...generateBoundaryValues(0, 10000000)],
  investment_amount: [...generateBoundaryValues(0, 10000000)],
  emergency_fund: [...generateBoundaryValues(0, 1000000)],
  other_debts: [...generateBoundaryValues(0, 1000000)],

  // Risk Assessment (risk_assessment section) - these are select fields with specific options
  attitude_to_risk: [
    'Very Low - I want to preserve capital',
    'Low - I can accept minimal fluctuations',
    'Medium - I can accept moderate fluctuations',
    'High - I can accept significant fluctuations',
    'Very High - I seek maximum growth',
    '', // empty
    'Invalid Option',
    EdgeCases.strings.scriptTag,
  ],
  capacity_for_loss: [
    'Devastating - would affect basic needs',
    'Significant - would affect lifestyle',
    'Moderate - would delay some goals',
    'Minor - would not materially affect me',
    '', // empty
    'Invalid Option',
  ],

  // Recommendation (recommendation section) - Allocations should sum to 100
  allocation_equities: [...generateBoundaryValues(0, 100)],
  allocation_bonds: [...generateBoundaryValues(0, 100)],
  allocation_cash: [...generateBoundaryValues(0, 100)],
  allocation_alternatives: [...generateBoundaryValues(0, 100)],

  // Product fields
  product_1_name: [
    EdgeCases.strings.empty,
    'Stocks & Shares ISA',
    'SIPP',
    'Investment Bond',
    EdgeCases.strings.maxLength.slice(0, 100),
    EdgeCases.strings.scriptTag,
  ],
  product_1_amount: [...generateBoundaryValues(0, 10000000)],
  product_1_reason: [
    EdgeCases.strings.empty,
    'Tax-efficient wrapper for long-term growth',
    EdgeCases.strings.maxLength,
    EdgeCases.strings.scriptTag,
    EdgeCases.strings.sqlInjection,
    EdgeCases.strings.newlines,
  ],
}

// ============================================
// STRESS TEST DATA
// ============================================
export const StressTestData = {
  // Large payload
  largePayload: Object.fromEntries(
    Array.from({ length: 100 }, (_, i) => [`field_${i}`, 'x'.repeat(1000)])
  ),

  // Many rapid changes - using correct field ID
  rapidChanges: Array.from({ length: 50 }, (_, i) => ({
    field: 'annual_income',
    value: i * 1000,
  })),

  // Concurrent save attempts
  concurrentSaves: 10,
}
