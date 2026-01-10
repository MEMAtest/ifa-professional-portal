import Stripe from 'stripe'

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  console.error('STRIPE_SECRET_KEY is required')
  process.exit(1)
}

const seatPrice = Number(process.env.STRIPE_SEAT_PRICE ?? 85)
if (!Number.isFinite(seatPrice)) {
  console.error('STRIPE_SEAT_PRICE must be a number')
  process.exit(1)
}

const currency = (process.env.STRIPE_CURRENCY ?? 'gbp').toLowerCase()

const stripe = new Stripe(secretKey, { apiVersion: '2024-06-20' })

async function run() {
  const baseProduct = await stripe.products.create({
    name: 'Plannetic Firm Plan',
    description: 'Base subscription for firms (contract term enforced by schedule).',
    metadata: { system: 'plannetic', type: 'base-plan' }
  })

  const seatProduct = await stripe.products.create({
    name: 'Plannetic Additional Seat',
    description: 'Additional user seat for Plannetic firms.',
    metadata: { system: 'plannetic', type: 'seat' }
  })

  const basePrices = [
    { term: 12, amount: 500 },
    { term: 24, amount: 415 },
    { term: 36, amount: 350 }
  ]

  const createdBasePrices = {}

  for (const price of basePrices) {
    const created = await stripe.prices.create({
      product: baseProduct.id,
      unit_amount: Math.round(price.amount * 100),
      currency,
      recurring: { interval: 'month' },
      nickname: `Plannetic Base ${price.term}m`,
      metadata: {
        system: 'plannetic',
        type: 'base-plan',
        term_months: String(price.term)
      }
    })
    createdBasePrices[price.term] = created.id
  }

  const seatPriceObj = await stripe.prices.create({
    product: seatProduct.id,
    unit_amount: Math.round(seatPrice * 100),
    currency,
    recurring: { interval: 'month' },
    nickname: 'Plannetic Seat',
    metadata: { system: 'plannetic', type: 'seat' }
  })

  console.log('Stripe bootstrap complete')
  console.log('Base product:', baseProduct.id)
  console.log('Seat product:', seatProduct.id)
  console.log('Price IDs:')
  console.log('  12m:', createdBasePrices[12])
  console.log('  24m:', createdBasePrices[24])
  console.log('  36m:', createdBasePrices[36])
  console.log('  Seat:', seatPriceObj.id)
}

run().catch((error) => {
  console.error('Stripe bootstrap failed:', error)
  process.exit(1)
})
