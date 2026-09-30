import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PaymentQrModal from "./PaymentQrModal";
import type { SubscriptionCheckoutResponse } from "@/api";

vi.mock("@/api", () => ({
  getCheckoutStatus: vi.fn(() => new Promise(() => undefined)),
}));

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const baseCheckout: SubscriptionCheckoutResponse = {
  intentId: "11111111-1111-1111-1111-111111111111",
  status: "pending",
  amount: 25000,
  currency: "XOF",
  planSlug: "pro",
  billingCycle: "monthly",
  channel: "orange_money",
  provider: "bictorys",
};

const originalMatchMedia = window.matchMedia;

function useDesktopViewport() {
  window.matchMedia = ((query: string) => ({
    ...originalMatchMedia(query),
    matches: /min-width/.test(query) && !/min-width:\s*(1200|1600)px/.test(query),
  })) as typeof window.matchMedia;
}

function renderModal(checkout: SubscriptionCheckoutResponse) {
  return render(
    <PaymentQrModal checkout={checkout} onClose={vi.fn()} onPaid={vi.fn()} onRetry={vi.fn()} />
  );
}

const qrSvg = () => document.querySelector(".ant-qrcode svg");
const qrImage = () => screen.queryByAltText("QR code de paiement");

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe("PaymentQrModal on desktop", () => {
  it("generates a QR from the payment link when Bictorys sends no image", () => {
    useDesktopViewport();
    renderModal({ ...baseCheckout, paymentLink: "https://om.example/pay/abc" });

    expect(qrSvg()).not.toBeNull();
    expect(qrImage()).toBeNull();
    expect(screen.getByText(/application Orange Money/)).not.toBeNull();
  });

  it("shows the Bictorys image and falls back to a generated QR on load error", () => {
    useDesktopViewport();
    renderModal({
      ...baseCheckout,
      channel: "wave",
      qrCode: PNG_BASE64,
      paymentLink: "https://pay.wave.com/c/abc",
    });

    const img = screen.getByAltText("QR code de paiement");
    expect(img.getAttribute("src")).toBe(`data:image/png;base64,${PNG_BASE64}`);

    fireEvent.error(img);

    expect(qrImage()).toBeNull();
    expect(qrSvg()).not.toBeNull();
  });

  it("tells the user to use the phone camera for the web checkout page", () => {
    useDesktopViewport();
    renderModal({ ...baseCheckout, checkoutUrl: "https://pay.bictorys.com/checkout/abc" });

    expect(qrSvg()).not.toBeNull();
    expect(screen.getByText(/appareil photo/)).not.toBeNull();
  });
});

describe("PaymentQrModal on mobile", () => {
  it("shows the open-app button and reveals the QR on demand", () => {
    renderModal({ ...baseCheckout, paymentLink: "https://om.example/pay/abc" });

    const openButton = screen.getByRole("link", { name: /Ouvrir Orange Money/ });
    expect(openButton.getAttribute("href")).toBe("https://om.example/pay/abc");
    expect(qrSvg()).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Afficher le QR code/ }));

    expect(qrSvg()).not.toBeNull();
  });
});
