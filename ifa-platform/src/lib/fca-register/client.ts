/**
 * FCA Register API Client
 * Provides methods to interact with the FCA Register API V0.1
 */

import {
  FCAClientConfig,
  FCAApiError,
  FirmResponse,
  PermissionsResponse,
  IndividualsResponse,
  NormalizedFirm,
  NormalizedPermission,
  NormalizedIndividual,
  FCAFirm,
  FirmPermission,
  FirmIndividual,
} from "./types"

const DEFAULT_BASE_URL = "https://register.fca.org.uk/services/V0.1"

export class FCARegisterClient {
  private config: FCAClientConfig
  private baseUrl: string

  constructor(config: FCAClientConfig) {
    this.config = config
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL
  }

  /**
   * Make an authenticated request to the FCA Register API
   */
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${encodeURI(endpoint)}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-AUTH-EMAIL": this.config.email,
          "X-AUTH-KEY": this.config.apiKey,
          Accept: "application/json",
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        const error: FCAApiError = {
          status: response.status,
          message: await response.text().catch(() => "Unknown error"),
          endpoint,
        }

        if (response.status === 404) {
          error.message = "Resource not found"
        } else if (response.status === 401) {
          error.message = "Authentication failed - check API credentials"
        } else if (response.status === 429) {
          error.message = "Rate limit exceeded - max 10 requests per 10 seconds"
        }

        throw error
      }

      return response.json()
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        const error: FCAApiError = {
          status: 408,
          message: "Request timeout - FCA API did not respond in time",
          endpoint,
        }
        throw error
      }

      throw err
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async getFirm(frn: string): Promise<FirmResponse> {
    return this.request<FirmResponse>(`/Firm/${frn}`)
  }

  async getFirmPermissions(frn: string): Promise<PermissionsResponse> {
    return this.request<PermissionsResponse>(`/Firm/${frn}/Permissions`)
  }

  async getFirmIndividuals(frn: string): Promise<IndividualsResponse> {
    return this.request<IndividualsResponse>(`/Firm/${frn}/Individuals`)
  }

  async getNormalizedFirm(frn: string): Promise<NormalizedFirm | null> {
    const response = await this.getFirm(frn)
    const firm = response.Data?.[0]
    if (!firm) return null
    return this.normalizeFirm(firm)
  }

  async getNormalizedPermissions(frn: string): Promise<NormalizedPermission[]> {
    const response = await this.getFirmPermissions(frn)
    return (response.Data || []).map(this.normalizePermission)
  }

  async getNormalizedIndividuals(frn: string): Promise<NormalizedIndividual[]> {
    const response = await this.getFirmIndividuals(frn)
    return (response.Data || []).map(this.normalizeIndividual)
  }

  private normalizeFirm(firm: FCAFirm): NormalizedFirm {
    return {
      frn: firm["FRN"],
      name: firm["Organisation Name"],
      status: firm["Status"],
      statusEffectiveDate: firm["Status Effective Date"],
      address: {
        line1: firm["Address Line 1"],
        line2: firm["Address Line 2"],
        line3: firm["Address Line 3"],
        line4: firm["Address Line 4"],
        town: firm["Town"],
        county: firm["County"],
        country: firm["Country"],
        postcode: firm["Postcode"],
      },
      phone: firm["Phone Number"],
      website: firm["Website"],
      companiesHouseNumber: firm["Companies House Number"],
      isAppointedRepresentative: firm["Appointed Representative"] || false,
      isPraRegulated: firm["PRA Regulated"] || false,
    }
  }

  private normalizePermission(permission: FirmPermission): NormalizedPermission {
    return {
      permission: permission["Permission"],
      investmentType: permission["Investment Type"],
      customerType: permission["Customer Type"],
      status: permission["Status"],
      effectiveDate: permission["Effective Date"],
    }
  }

  private normalizeIndividual(individual: FirmIndividual): NormalizedIndividual {
    return {
      irn: individual["IRN"],
      name: individual["Name"],
      status: individual["Status"],
      controlFunctions: individual["Control Functions"]?.map((cf) => ({
        function: cf["Function"],
        status: cf["Status"],
        effectiveFrom: cf["Effective From"],
        effectiveTo: cf["Effective To"],
      })),
    }
  }
}

/**
 * Get validated FCA API configuration from environment variables.
 */
export function getFCAConfig(): { email: string; apiKey: string; baseUrl: string } {
  if (typeof window !== "undefined") {
    throw new Error("FCA config can only be accessed server-side")
  }

  const email = process.env.FCA_REGISTER_EMAIL
  const apiKey = process.env.FCA_REGISTER_API_KEY

  if (!email || !apiKey) {
    throw new Error(
      "FCA Register API credentials not configured. Set FCA_REGISTER_EMAIL and FCA_REGISTER_API_KEY."
    )
  }

  return { email, apiKey, baseUrl: DEFAULT_BASE_URL }
}

/**
 * Create a configured FCA Register client using environment variables.
 */
export function createFCAClient(): FCARegisterClient {
  const { email, apiKey } = getFCAConfig()
  return new FCARegisterClient({ email, apiKey })
}
