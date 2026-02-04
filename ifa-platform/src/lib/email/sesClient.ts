import { SESv2Client } from '@aws-sdk/client-sesv2'

let sesClient: SESv2Client | null = null

export function getSESClient(): SESv2Client {
  if (!sesClient) {
    const region = process.env.AWS_SES_REGION || 'eu-west-2'
    const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS SES credentials are not configured (AWS_SES_ACCESS_KEY_ID / AWS_SES_SECRET_ACCESS_KEY)')
    }

    sesClient = new SESv2Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }
  return sesClient
}
