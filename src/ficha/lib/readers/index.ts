/** REQ-10826 · Un lector por superficie (decisión 3); todos comparten `commonFacts`, por eso dan el mismo dato. */
export { commonFacts, PARITY_KEYS, providerPriceText, type CommonFacts, type ReaderContext } from "./common";
export { readPage, type PageRead, type PageReaderContext } from "./page";
export { readMila, type MilaRead } from "./mila";
export { readEmail, type EmailRead } from "./email";
export { readBooking, type BookingRead, type BookingReaderContext } from "./booking";
export { readSearch, type SearchRead } from "./search";
