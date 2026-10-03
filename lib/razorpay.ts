/**
 * Razorpay Standard Checkout, wrapped as one promise-returning call.
 * The gateway's checkout.js is loaded on demand (first payment only) rather
 * than on every page — it's dead weight everywhere except this one flow.
 */

interface RazorpayResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
  on(event: "payment.failed", handler: (response: { error?: { description?: string } }) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // let a later attempt retry after a flaky network
      reject(new Error("Could not load the payment gateway"));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Opens the Razorpay modal and settles once the user is done:
 * resolves with the payment ids on success, resolves `null` if they closed
 * the modal without paying, rejects if the payment itself failed.
 */
export async function payWithRazorpay(options: {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  name: string;
  description: string;
  prefill?: { name?: string; contact?: string; email?: string };
}): Promise<RazorpayResult | null> {
  await loadCheckoutScript();
  const Razorpay = window.Razorpay;
  if (!Razorpay) throw new Error("Could not load the payment gateway");

  return new Promise<RazorpayResult | null>((resolve, reject) => {
    let settled = false;
    const checkout = new Razorpay({
      key: options.keyId,
      order_id: options.razorpayOrderId,
      amount: options.amountPaise,
      currency: options.currency,
      name: options.name,
      description: options.description,
      prefill: options.prefill ?? {},
      theme: { color: "#dfb564" },
      handler: (result: RazorpayResult) => {
        settled = true;
        resolve(result);
      },
      modal: {
        ondismiss: () => {
          // Fires on close AFTER a success too, hence the `settled` guard.
          if (!settled) resolve(null);
        },
      },
    });
    checkout.on("payment.failed", (response) => {
      settled = true;
      reject(new Error(response.error?.description ?? "Payment failed"));
    });
    checkout.open();
  });
}
