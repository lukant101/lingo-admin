const FIELD_LABELS: Record<string, string> = {
  "individual.verification.document": "Identity document",
  "individual.verification.additional_document": "Additional identity document",
  "individual.id_number": "ID number (SSN / tax ID)",
  "individual.ssn_last_4": "Last 4 digits of SSN",
  "individual.address.city": "City",
  "individual.address.line1": "Address",
  "individual.address.postal_code": "Postal code",
  "individual.address.state": "State",
  "individual.phone": "Phone number",
  "individual.email": "Email address",
  "individual.first_name": "First name",
  "individual.last_name": "Last name",
  "business_profile.url": "Business website URL",
  "business_profile.mcc": "Business category",
  "business_profile.product_description": "Product description",
  "company.address.city": "Company city",
  "company.address.line1": "Company address",
  "company.address.postal_code": "Company postal code",
  "company.address.state": "Company state",
  "company.name": "Company name",
  "company.phone": "Company phone",
  "company.tax_id": "Company tax ID",
  external_account: "Bank account",
  "tos_acceptance.date": "Terms of service",
  "tos_acceptance.ip": "Terms of service",
  "representative.first_name": "Representative name",
  "representative.last_name": "Representative name",
  owners_provided: "Business owners",
};

// Groups that should be deduplicated into a single label
const FIELD_GROUPS: Record<string, string> = {
  "dob.day": "Date of birth",
  "dob.month": "Date of birth",
  "dob.year": "Date of birth",
  "individual.dob.day": "Date of birth",
  "individual.dob.month": "Date of birth",
  "individual.dob.year": "Date of birth",
  "individual.address.city": "Address",
  "individual.address.line1": "Address",
  "individual.address.postal_code": "Address",
  "individual.address.state": "Address",
  "company.address.city": "Company address",
  "company.address.line1": "Company address",
  "company.address.postal_code": "Company address",
  "company.address.state": "Company address",
  "tos_acceptance.date": "Terms of service",
  "tos_acceptance.ip": "Terms of service",
  "representative.first_name": "Representative name",
  "representative.last_name": "Representative name",
};

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Maps a Stripe field name to a human-readable label.
 */
export function humanizeStripeField(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  // Fallback: title-case the last dotted segment
  const last = field.split(".").pop() ?? field;
  return titleCase(last);
}

/**
 * Maps and deduplicates an array of Stripe field names into readable labels.
 * e.g. ["dob.day", "dob.month", "dob.year"] → ["Date of birth"]
 */
export function humanizeStripeFields(fields: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const field of fields) {
    const label = FIELD_GROUPS[field] ?? humanizeStripeField(field);
    if (!seen.has(label)) {
      seen.add(label);
      result.push(label);
    }
  }

  return result;
}
