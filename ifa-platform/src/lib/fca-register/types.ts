/**
 * FCA Register API Types
 * Based on FCA Register API V0.1
 */

// Firm Types

export interface FCAFirm {
  "Organisation Name": string
  "FRN": string
  "Status": FirmStatus
  "Status Effective Date": string
  "Address Line 1"?: string
  "Address Line 2"?: string
  "Address Line 3"?: string
  "Address Line 4"?: string
  "Town"?: string
  "County"?: string
  "Country"?: string
  "Postcode"?: string
  "Phone Number"?: string
  "Website"?: string
  "Companies House Number"?: string
  "Appointed Representative"?: boolean
  "PRA Regulated"?: boolean
}

export type FirmStatus =
  | "Authorised"
  | "Registered"
  | "No longer authorised"
  | "Appointed representative"
  | "EEA authorised"
  | "Cancelled"
  | "Refused"

export interface FirmPermission {
  "Permission": string
  "Investment Type"?: string
  "Customer Type"?: string
  "Status": PermissionStatus
  "Effective Date": string
}

export type PermissionStatus = "Applied for" | "Granted" | "Cancelled" | "Varied"

export interface FirmIndividual {
  "IRN": string
  "Name": string
  "Status": string
  "Control Functions"?: ControlFunction[]
}

export interface ControlFunction {
  "Function": string
  "Status": string
  "Effective From": string
  "Effective To"?: string
}

// API Response Wrappers

export interface FCAApiResponse<T> {
  Data?: T[]
  Message?: string
  Status?: string
  ResultInfo?: {
    page: number
    per_page: number
    total_count: number
  }
}

export interface FirmResponse extends FCAApiResponse<FCAFirm> {}
export interface PermissionsResponse extends FCAApiResponse<FirmPermission> {}
export interface IndividualsResponse extends FCAApiResponse<FirmIndividual> {}

// Client Configuration

export interface FCAClientConfig {
  email: string
  apiKey: string
  baseUrl?: string
}

export interface FCAApiError {
  status: number
  message: string
  endpoint: string
}

/**
 * Type guard to check if an unknown error is an FCAApiError
 */
export function isFCAApiError(error: unknown): error is FCAApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    "message" in error &&
    "endpoint" in error &&
    typeof (error as FCAApiError).status === "number" &&
    typeof (error as FCAApiError).message === "string"
  )
}

// Normalized Types (for internal use)

export interface NormalizedFirm {
  frn: string
  name: string
  status: FirmStatus
  statusEffectiveDate: string
  address?: {
    line1?: string
    line2?: string
    line3?: string
    line4?: string
    town?: string
    county?: string
    country?: string
    postcode?: string
  }
  phone?: string
  website?: string
  companiesHouseNumber?: string
  isAppointedRepresentative: boolean
  isPraRegulated: boolean
}

export interface NormalizedPermission {
  permission: string
  investmentType?: string
  customerType?: string
  status: PermissionStatus
  effectiveDate: string
}

export interface NormalizedIndividual {
  irn: string
  name: string
  status: string
  controlFunctions?: Array<{
    function: string
    status: string
    effectiveFrom: string
    effectiveTo?: string
  }>
}
