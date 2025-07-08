// ================================================================
// FILE 4: Create ATR Questions Data
// Path: ifa-platform/src/data/atrQuestions.ts
// ================================================================

export interface ATRQuestion {
  id: string
  text: string
  options: string[]
  scores: number[]
  category: 'attitude' | 'experience' | 'knowledge' | 'emotional'
  weight: number
}

export const atrQuestions: ATRQuestion[] = [
  {
    id: 'atr_1',
    text: 'How would you describe your investment experience?',
    options: [
      'No prior investment experience',
      'Limited experience with basic investments',
      'Moderate experience with various investments',
      'Extensive experience with complex investments',
      'Professional investment experience'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'experience',
    weight: 1.2
  },
  {
    id: 'atr_2',
    text: 'If your investment portfolio lost 20% of its value in one month, what would you do?',
    options: [
      'Sell immediately to avoid further losses',
      'Sell some investments to reduce risk',
      'Hold and wait for recovery',
      'Buy more while prices are lower',
      'Invest significantly more at lower prices'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'emotional',
    weight: 1.5
  },
  {
    id: 'atr_3',
    text: 'What is your primary investment objective?',
    options: [
      'Capital preservation - avoid losses',
      'Income generation with modest growth',
      'Balanced growth and income',
      'Long-term capital growth',
      'Maximum capital appreciation'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'attitude',
    weight: 1.3
  },
  {
    id: 'atr_4',
    text: 'Over what time period do you expect to invest?',
    options: [
      'Less than 2 years',
      '2-5 years',
      '5-10 years',
      '10-20 years',
      'More than 20 years'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'attitude',
    weight: 1.1
  },
  {
    id: 'atr_5',
    text: 'How important is it to have access to your investments quickly?',
    options: [
      'Very important - need immediate access',
      'Somewhat important - access within weeks',
      'Moderately important - access within months',
      'Not very important - can wait years',
      'Not important - long-term investment'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'attitude',
    weight: 1.0
  },
  {
    id: 'atr_6',
    text: 'Which statement best describes your attitude to investment risk?',
    options: [
      'I prefer certainty and will accept lower returns',
      'I will accept small fluctuations for modest returns',
      'I will accept moderate volatility for reasonable returns',
      'I will accept high volatility for potentially higher returns',
      'I actively seek high-risk, high-reward opportunities'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'attitude',
    weight: 1.4
  },
  {
    id: 'atr_7',
    text: 'How would you feel if your investments fluctuated significantly in value?',
    options: [
      'Very uncomfortable - would lose sleep',
      'Uncomfortable but could tolerate short-term',
      'Neutral - understand it is normal',
      'Comfortable - focus on long-term goals',
      'Excited - see it as opportunity'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'emotional',
    weight: 1.3
  },
  {
    id: 'atr_8',
    text: 'What percentage of your investment portfolio would you be comfortable placing in higher-risk investments?',
    options: [
      '0% - I want guaranteed returns',
      '1-20% - Very small allocation',
      '21-40% - Moderate allocation',
      '41-60% - Significant allocation',
      '61-100% - Majority or all'
    ],
    scores: [1, 2, 3, 4, 5],
    category: 'attitude',
    weight: 1.2
  }
]