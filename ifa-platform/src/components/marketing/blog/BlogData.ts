export interface BlogSection {
  heading?: string
  body: string[]
}

export interface BlogPost {
  slug: string
  title: string
  summary: string
  date: string
  category: string
  readingTime: string
  author: string
  tags: string[]
  cover: {
    tone: 'teal' | 'blue' | 'amber'
    icon: 'compliance' | 'suitability' | 'planning'
    label: string
  }
  coverImage: {
    src: string
    alt: string
  }
  highlights?: Array<{
    title: string
    metric: string
    detail: string
    chart: 'bars' | 'stack' | 'meter' | 'spark'
  }>
  sources?: Array<{
    label: string
    url: string
  }>
  sections: BlogSection[]
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'consumer-duty-monitoring-that-holds-up',
    title: 'Consumer Duty monitoring that holds up to scrutiny',
    summary: 'A practical framework for evidence-based monitoring that links client outcomes to governance, MI, and remediation workflows.',
    date: '26 Dec 2025',
    category: 'Compliance',
    readingTime: '6 min read',
    author: 'Plannetic Research',
    tags: ['Consumer Duty', 'Governance', 'MI'],
    cover: {
      tone: 'teal',
      icon: 'compliance',
      label: 'Consumer Duty'
    },
    coverImage: {
      src: '/blog/consumer-duty.png',
      alt: 'Compliance dashboard with monitoring signals'
    },
    highlights: [
      {
        title: 'Duty outcomes',
        metric: '4 outcomes',
        detail: 'Products & services, price & value, understanding, support.',
        chart: 'stack'
      },
      {
        title: 'Monitoring layers',
        metric: '3 layers',
        detail: 'Governance, MI, remediation workflow.',
        chart: 'bars'
      },
      {
        title: 'Portfolio letters',
        metric: 'Sector-led',
        detail: 'Consumer investments, asset management and more.',
        chart: 'meter'
      }
    ],
    sources: [
      {
        label: 'FCA Consumer Duty overview',
        url: 'https://www.fca.org.uk/firms/consumer-duty'
      },
      {
        label: 'PS22/9: A new Consumer Duty',
        url: 'https://www.fca.org.uk/publications/policy-statements/ps22-9-new-consumer-duty'
      },
      {
        label: 'FG22/5: Finalised Guidance for firms on the Consumer Duty',
        url: 'https://www.fca.org.uk/publication/finalised-guidance/fg22-5.pdf'
      },
      {
        label: 'Consumer Duty portfolio letters (consumer investments)',
        url: 'https://www.fca.org.uk/publication/correspondence/consumer-duty-letter-consumer-investments.pdf'
      },
      {
        label: 'Consumer Duty resources: portfolio and sector communications',
        url: 'https://www.fca.org.uk/firms/consumer-duty/resources#section-portfolio-and-sector-communications'
      }
    ],
    sections: [
      {
        heading: 'Regulatory lens',
        body: [
          'Consumer Duty raises the bar on evidencing outcomes. The FCA expects firms to show how governance, monitoring and remediation demonstrate good outcomes across products and services, not just at point of sale.',
          'Portfolio letters and Dear CEO communications highlight specific expectations for sectors such as consumer investments, reinforcing that firms must embed monitoring and act on poor outcomes.'
        ]
      },
      {
        heading: 'A three-layer monitoring model',
        body: [
          'Start with governance: define measurable outcomes, appoint accountable owners, and set review cadence.',
          'Layer in client-level MI such as suitability status, review completion, vulnerability indicators and complaint trends, mapped to the four Consumer Duty outcomes.',
          'Finally, connect remediation directly to workflow tasks so every decision is recorded, assigned and time-bound.'
        ]
      },
      {
        heading: 'What good evidence looks like',
        body: [
          'Evidence is more than a dashboard. It should show the reason for monitoring thresholds, the data sources used, the decisions made and the follow-up actions taken.',
          'A single audit trail that links governance minutes, MI snapshots and client outcomes is the standard firms are moving toward.'
        ]
      },
      {
        heading: 'How Plannetic supports evidence',
        body: [
          'Plannetic connects assessments, cash flow projections and review workflows in one timeline. Outcome monitoring is visible at both firm and client level, with remediation actions tracked end-to-end.',
          'The result is audit-ready evidence without manual chasing or fragmented reporting.'
        ]
      }
    ]
  },
  {
    slug: 'suitability-assessments-that-scale',
    title: 'Suitability assessments that scale across your firm',
    summary: 'Move beyond static PDFs. Build a repeatable suitability engine that is consistent, evidence-based, and easy to review.',
    date: '19 Dec 2025',
    category: 'Suitability',
    readingTime: '5 min read',
    author: 'Plannetic Editorial',
    tags: ['Suitability', 'ATR', 'CFL'],
    cover: {
      tone: 'amber',
      icon: 'suitability',
      label: 'Suitability'
    },
    coverImage: {
      src: '/blog/suitability.png',
      alt: 'Suitability assessment overview with structured inputs'
    },
    highlights: [
      {
        title: 'COBS coverage',
        metric: 'COBS 9/9A',
        detail: 'Suitability plus pensions and retirement guidance.',
        chart: 'stack'
      },
      {
        title: 'Evidence inputs',
        metric: '6 inputs',
        detail: 'Objectives, horizon, ATR, CFL, affordability, vulnerability.',
        chart: 'bars'
      },
      {
        title: 'Review trail',
        metric: 'Traceable',
        detail: 'Clear link from inputs to recommendation.',
        chart: 'spark'
      }
    ],
    sources: [
      {
        label: 'FCA Handbook COBS 9 (Suitability)',
        url: 'https://handbook.fca.org.uk/handbook/COBS/9/'
      },
      {
        label: 'FCA Handbook COBS 9A (Pensions and retirement)',
        url: 'https://handbook.fca.org.uk/handbook/COBS/9A/'
      },
      {
        label: 'FG21/1: Guidance for firms on the fair treatment of vulnerable customers',
        url: 'https://www.fca.org.uk/publication/finalised-guidance/fg21-1.pdf'
      },
      {
        label: 'FCA Handbook PROD',
        url: 'https://handbook.fca.org.uk/handbook/PROD/'
      }
    ],
    sections: [
      {
        heading: 'Regulatory lens',
        body: [
          'COBS 9 and COBS 9A set out the requirement to ensure personal recommendations are suitable. That means the advice must align to objectives, risk profile, time horizon and vulnerability considerations.',
          'Regulators increasingly expect consistency: clear inputs, traceable reasoning and outputs that are reviewable.'
        ]
      },
      {
        heading: 'Standardise the inputs',
        body: [
          'Capture a consistent baseline: objectives, time horizon, ATR, CFL, affordability and vulnerability indicators. Missing data should block completion until resolved.',
          'Consistency in inputs is what makes outcomes defensible and MI reliable.'
        ]
      },
      {
        heading: 'Create review-ready outputs',
        body: [
          'Outputs should read like a decision trail: what was captured, what was concluded and why. That makes internal review faster and external scrutiny far easier.',
          'Summaries should be clear enough for clients and structured enough for compliance teams.'
        ]
      },
      {
        heading: 'How Plannetic scales suitability',
        body: [
          'Plannetic standardises suitability assessments across your firm, auto-generates summaries, and keeps every rationale linked to evidence.',
          'Compliance can review by exception while advisers maintain a consistent client experience.'
        ]
      }
    ]
  },
  {
    slug: 'monte-carlo-and-sequence-risk-explained',
    title: 'Monte Carlo and sequence risk: what clients need to see',
    summary: 'How to explain probability, volatility, and withdrawal risk in a way clients understand, without over-promising outcomes.',
    date: '12 Dec 2025',
    category: 'Planning',
    readingTime: '7 min read',
    author: 'Plannetic Insights',
    tags: ['Monte Carlo', 'Cash flow', 'Risk'],
    cover: {
      tone: 'blue',
      icon: 'planning',
      label: 'Monte Carlo'
    },
    coverImage: {
      src: '/blog/monte-carlo.png',
      alt: 'Monte Carlo probability chart with scenario ranges'
    },
    highlights: [
      {
        title: 'Range view',
        metric: '3 bands',
        detail: 'Downside, central, upside outcomes.',
        chart: 'bars'
      },
      {
        title: 'Stress tests',
        metric: '2 tests',
        detail: 'High inflation and early drawdown.',
        chart: 'stack'
      },
      {
        title: 'Decision levers',
        metric: '3 levers',
        detail: 'Age, withdrawals, contributions.',
        chart: 'meter'
      }
    ],
    sources: [
      {
        label: 'FCA Handbook COBS 9A',
        url: 'https://handbook.fca.org.uk/handbook/COBS/9A/'
      },
      {
        label: 'FG22/5: Consumer Duty finalised guidance',
        url: 'https://www.fca.org.uk/publication/finalised-guidance/fg22-5.pdf'
      }
    ],
    sections: [
      {
        heading: 'Regulatory lens',
        body: [
          'Stress testing and cash flow evidence underpin good financial planning. Clients need to understand the range of outcomes, not a single forecast.',
          'Explaining volatility, sequence risk and inflation impact supports both suitability decisions and consumer understanding.'
        ]
      },
      {
        heading: 'Explain the range, not the average',
        body: [
          'Show probability bands, potential shortfall years and the effect of early market drawdowns. This is where clients see the real cost of risk.',
          'A range-based narrative supports realistic expectations and helps link advice to risk appetite.'
        ]
      },
      {
        heading: 'Tie projections to real actions',
        body: [
          'Use the model to drive decisions: adjust retirement age, reduce withdrawals, or stress test inflation spikes.',
          'Scenario comparison makes trade-offs tangible and supports a documented recommendation.'
        ]
      },
      {
        heading: 'How Plannetic supports planning',
        body: [
          'Plannetic combines Monte Carlo and cash flow with side-by-side scenarios, clear visuals and an audit trail of the recommendation logic.',
          'Advisers can demonstrate both the decision and the evidence behind it.'
        ]
      }
    ]
  }
]
