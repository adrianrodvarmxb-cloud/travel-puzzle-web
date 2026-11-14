/**
 * Datos de muestra con la forma OCTO (octo.travel / Ventrata), solo para pruebas. Nombres ficticios, sin datos reales.
 */
export function sampleProduct(): Record<string, unknown> {
  return {
    id: "prod-hoho-nyc",
    internalName: "Hop-on Hop-off Discover",
    reference: null,
    locale: "en",
    timeZone: "America/New_York",
    allowFreesale: true,
    instantConfirmation: true,
    instantDelivery: true,
    availabilityRequired: true,
    availabilityType: "OPENING_HOURS",
    deliveryFormats: ["QRCODE", "PDF_URL"],
    deliveryMethods: ["VOUCHER"],
    redemptionMethod: "DIGITAL",
    defaultCurrency: "USD",
    availableCurrencies: ["USD"],
    pricingPer: "UNIT",
    options: [
      {
        id: "DEFAULT",
        default: true,
        internalName: "1 día",
        reference: null,
        availabilityLocalStartTimes: ["00:00"],
        cancellationCutoff: "24 hours",
        cancellationCutoffAmount: 24,
        cancellationCutoffUnit: "hour",
        requiredContactFields: [],
        restrictions: { minUnits: 1, maxUnits: null },
        units: [
          {
            id: "unit-adult",
            internalName: "Adult",
            reference: null,
            type: "ADULT",
            restrictions: { minAge: 13, maxAge: 99, idRequired: false, minQuantity: null, maxQuantity: null, paxCount: 1, accompaniedBy: [] },
            requiredContactFields: [],
            pricingFrom: [{ original: 4900, retail: 4900, net: 3920, currency: "USD", currencyPrecision: 2, includedTaxes: [] }],
          },
          {
            id: "unit-child",
            internalName: "Child",
            reference: null,
            type: "CHILD",
            restrictions: { minAge: 3, maxAge: 12, idRequired: false, minQuantity: null, maxQuantity: null, paxCount: 1, accompaniedBy: ["ADULT"] },
            requiredContactFields: [],
            pricingFrom: [{ original: 3900, retail: 3900, net: 3120, currency: "USD", currencyPrecision: 2, includedTaxes: [] }],
          },
        ],
      },
    ],
  };
}

export function sampleBooking(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "bk-1",
    uuid: "11111111-2222-4333-8444-555555555555",
    testMode: true,
    resellerReference: "TP-20261112-001",
    supplierReference: "BB-K3RM568F",
    status: "CONFIRMED",
    utcCreatedAt: "2026-11-12T10:00:00Z",
    utcUpdatedAt: "2026-11-12T10:05:00Z",
    utcExpiresAt: null,
    utcRedeemedAt: null,
    utcConfirmedAt: "2026-11-12T10:05:00Z",
    productId: "prod-hoho-nyc",
    optionId: "DEFAULT",
    availabilityId: "2026-12-01T00:00:00-05:00",
    cancellable: true,
    deliveryMethods: ["VOUCHER"],
    voucher: {
      redemptionMethod: "DIGITAL",
      utcRedeemedAt: null,
      deliveryOptions: [
        { deliveryFormat: "QRCODE", deliveryValue: "BB-K3RM568F" },
        { deliveryFormat: "PDF_URL", deliveryValue: "https://example.test/voucher.pdf" },
      ],
    },
    unitItems: [
      { uuid: "u-1", unitId: "unit-adult", ticket: { redemptionMethod: "DIGITAL", utcRedeemedAt: null, deliveryOptions: [{ deliveryFormat: "QRCODE", deliveryValue: "T-1" }] } },
      { uuid: "u-2", unitId: "unit-adult", ticket: { redemptionMethod: "DIGITAL", utcRedeemedAt: null, deliveryOptions: [{ deliveryFormat: "QRCODE", deliveryValue: "T-2" }] } },
    ],
    pricing: { original: 9800, retail: 9800, net: 7840, currency: "USD", currencyPrecision: 2, includedTaxes: [] },
    ...over,
  };
}
