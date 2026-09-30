/** Max length antd QRCode can encode reliably (byte mode, error level M). */
export const QR_MAX_PAYLOAD_LENGTH = 2000;

export type PaymentQrSource =
  | { kind: "image"; src: string }
  | { kind: "payload"; value: string; isWebPage: boolean };

type PaymentQrInput = {
  qrCode?: string;
  paymentLink?: string;
  checkoutUrl?: string;
};

const IMAGE_URL_PATTERN = /\.(png|jpe?g|gif|svg|webp)(\?.*)?$/i;
const BASE64_PATTERN = /^[A-Za-z0-9+/=\s]+$/;
const PNG_BASE64_PREFIX = "iVBOR";
const JPEG_BASE64_PREFIX = "/9j/";

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function toPayload(value: string, isWebPage: boolean): PaymentQrSource | null {
  return value.length <= QR_MAX_PAYLOAD_LENGTH ? { kind: "payload", value, isWebPage } : null;
}

/**
 * Bictorys documents `qrCode` as a base64 PNG, but it may also come as a
 * data URI, an image URL or the raw payload to encode (operator deep link).
 */
export function resolveQrImage(qrCode: string | undefined): PaymentQrSource | null {
  const raw = qrCode?.trim();
  if (!raw) return null;
  if (raw.startsWith("data:image/")) return { kind: "image", src: raw };
  if (isHttpUrl(raw)) {
    return IMAGE_URL_PATTERN.test(raw) ? { kind: "image", src: raw } : toPayload(raw, false);
  }
  if (raw.startsWith(PNG_BASE64_PREFIX) && BASE64_PATTERN.test(raw)) {
    return { kind: "image", src: `data:image/png;base64,${raw.replace(/\s/g, "")}` };
  }
  if (raw.startsWith(JPEG_BASE64_PREFIX) && BASE64_PATTERN.test(raw)) {
    return { kind: "image", src: `data:image/jpeg;base64,${raw.replace(/\s/g, "")}` };
  }
  return toPayload(raw, false);
}

/**
 * QR generated client-side when Bictorys sends no usable image: the operator
 * deep link first, otherwise the Bictorys web checkout page.
 */
export function resolveGeneratedQr(input: PaymentQrInput): PaymentQrSource | null {
  const link = input.paymentLink?.trim();
  if (link) return toPayload(link, false);
  const checkout = input.checkoutUrl?.trim();
  if (checkout) return toPayload(checkout, true);
  return null;
}

export function resolvePaymentQr(input: PaymentQrInput): PaymentQrSource | null {
  return resolveQrImage(input.qrCode) ?? resolveGeneratedQr(input);
}
