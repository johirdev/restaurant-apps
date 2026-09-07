import type { IRestaurantSettings } from "@/src/interfaces/settings.interface";

/* ==========================================================================
   INVOICE / KITCHEN TICKET — ছাপার জন্য HTML
   --------------------------------------------------------------------------
   অ্যাপের CSS এর সাথে লড়াই না করে বিলটা একটা লুকানো iframe এ নিজের মতো
   করে বানানো হয়। ফলে ৮০ মিমি থার্মাল প্রিন্টারেও ঠিকঠাক বের হয়, আর
   ব্রাউজারের পপ-আপ ব্লকারও বাধা দেয় না।
   ========================================================================== */

export interface InvoiceOrder {
  order_number: string;
  createdAt: string;
  order_type: "delivery" | "pickup" | "dine_in";
  status: string;
  table_name?: string;
  guests?: number;
  payment_method: string;
  payment_status: string;
  customer: { name: string; phone: string; address?: string; note?: string };
  waiter?: { name?: string };
  taken_by?: { name?: string };
  items: {
    name: string;
    variation_name?: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    note?: string;
    added_later?: boolean;
  }[];
  pricing: {
    subtotal: number;
    discount: number;
    service_charge: number;
    vat: number;
    delivery_fee: number;
    total: number;
    vat_percent: number;
    service_charge_percent: number;
    tax_mode: "exclusive" | "inclusive";
  };
}

/** HTML এ বসানোর আগে বিপজ্জনক অক্ষর সরাই — কাস্টমারের নাম থেকেও ট্যাগ আসতে পারে */
const esc = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const bdTime = (iso: string) =>
  new Date(iso).toLocaleString("en-BD", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const ORDER_TYPE_LABEL: Record<string, string> = {
  delivery: "Delivery",
  pickup: "Pickup",
  dine_in: "Dine in",
};

const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash",
  bkash: "bKash",
  nagad: "Nagad",
  card: "Card",
};

/* ==========================================================================
   ১. কাস্টমারের বিল
   ========================================================================== */
export function buildInvoiceHtml(
  order: InvoiceOrder,
  settings: IRestaurantSettings,
): string {
  const c = settings.currency;
  const money = (n: number) =>
    c + Number(n || 0).toLocaleString("en-BD", { maximumFractionDigits: 2 });

  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td class="qty">${item.quantity}</td>
        <td>
          ${esc(item.name)}${
            item.variation_name
              ? `<span class="sub"> (${esc(item.variation_name)})</span>`
              : ""
          }
          ${item.note ? `<div class="note">${esc(item.note)}</div>` : ""}
        </td>
        <td class="num">${money(item.unit_price)}</td>
        <td class="num">${money(item.subtotal)}</td>
      </tr>`,
    )
    .join("");

  const totalLine = (label: string, value: number, strong = false) => `
    <tr class="${strong ? "grand" : ""}">
      <td colspan="3">${esc(label)}</td>
      <td class="num">${money(value)}</td>
    </tr>`;

  const p = order.pricing;

  const extras = [
    p.discount > 0 ? totalLine("Discount", -p.discount) : "",
    p.service_charge > 0
      ? totalLine(`Service charge (${p.service_charge_percent}%)`, p.service_charge)
      : "",
    p.vat > 0
      ? totalLine(
          p.tax_mode === "inclusive"
            ? `VAT (${p.vat_percent}% — included)`
            : `VAT (${p.vat_percent}%)`,
          p.vat,
        )
      : "",
    p.delivery_fee > 0 ? totalLine("Delivery", p.delivery_fee) : "",
  ].join("");

  const servedBy =
    settings.invoice_show_staff && (order.waiter?.name || order.taken_by?.name)
      ? `<div class="meta">Served by ${esc(order.waiter?.name || order.taken_by?.name)}</div>`
      : "";

  return page(
    `Invoice ${esc(order.order_number)}`,
    `
    <header>
      ${settings.logo ? `<img class="logo" src="${esc(settings.logo)}" alt="" />` : ""}
      <h1>${esc(settings.restaurant_name)}</h1>
      ${settings.address ? `<div class="meta">${esc(settings.address)}</div>` : ""}
      ${settings.phone ? `<div class="meta">${esc(settings.phone)}</div>` : ""}
      ${settings.vat_reg_no ? `<div class="meta">VAT/BIN: ${esc(settings.vat_reg_no)}</div>` : ""}
    </header>

    <div class="rule"></div>

    <div class="info">
      <div><b>${esc(order.order_number)}</b></div>
      <div>${esc(bdTime(order.createdAt))}</div>
      <div>${esc(ORDER_TYPE_LABEL[order.order_type] || order.order_type)}${
        order.table_name ? ` · ${esc(order.table_name)}` : ""
      }${order.guests ? ` · ${order.guests} guests` : ""}</div>
      <div>${esc(order.customer.name)} · ${esc(order.customer.phone)}</div>
      ${
        order.order_type === "delivery" && order.customer.address
          ? `<div>${esc(order.customer.address)}</div>`
          : ""
      }
      ${servedBy}
    </div>

    <div class="rule"></div>

    <table>
      <thead>
        <tr><th class="qty">Qty</th><th>Item</th><th class="num">Rate</th><th class="num">Amount</th></tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        ${totalLine("Subtotal", p.subtotal)}
        ${extras}
        ${totalLine("Total", p.total, true)}
      </tfoot>
    </table>

    <div class="rule"></div>

    <div class="info">
      <div>Payment: ${esc(PAYMENT_LABEL[order.payment_method] || order.payment_method)} · ${esc(
        order.payment_status === "paid" ? "PAID" : "UNPAID",
      )}</div>
      ${order.customer.note ? `<div>Note: ${esc(order.customer.note)}</div>` : ""}
    </div>

    <footer>
      ${esc(settings.invoice_footer)}
    </footer>
    `,
  );
}

/* ==========================================================================
   ২. রান্নাঘরের টিকিট — দাম ছাড়া, বড় অক্ষরে
   ========================================================================== */
export function buildKitchenTicketHtml(
  order: InvoiceOrder,
  settings: IRestaurantSettings,
): string {
  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td class="qty big">${item.quantity}×</td>
        <td class="big">
          ${esc(item.name)}${
            item.variation_name
              ? `<span class="sub"> (${esc(item.variation_name)})</span>`
              : ""
          }
          ${item.note ? `<div class="note">${esc(item.note)}</div>` : ""}
          ${item.added_later ? `<div class="note">** ADDED LATER **</div>` : ""}
        </td>
      </tr>`,
    )
    .join("");

  return page(
    `Kitchen ${esc(order.order_number)}`,
    `
    <header>
      <h1>KITCHEN</h1>
      <div class="meta">${esc(settings.restaurant_name)}</div>
    </header>

    <div class="rule"></div>

    <div class="info">
      <div class="big"><b>${esc(
        order.table_name || ORDER_TYPE_LABEL[order.order_type] || "",
      )}</b></div>
      <div><b>${esc(order.order_number)}</b> · ${esc(bdTime(order.createdAt))}</div>
      ${order.waiter?.name ? `<div>Waiter: ${esc(order.waiter.name)}</div>` : ""}
    </div>

    <div class="rule"></div>

    <table><tbody>${rows}</tbody></table>
    `,
  );
}

/* ==========================================================================
   দুটো টিকিটেরই সাধারণ মোড়ক
   ========================================================================== */
function page(title: string, body: string) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "Courier New", ui-monospace, monospace;
    font-size: 12px; line-height: 1.45;
    color: #000; background: #fff;
    margin: 0; padding: 10px;
    width: 80mm;
  }
  header { text-align: center; }
  .logo { max-width: 46mm; max-height: 20mm; object-fit: contain; margin-bottom: 4px; }
  h1 { font-size: 16px; margin: 0 0 2px; letter-spacing: .5px; }
  .meta { font-size: 11px; }
  .rule { border-top: 1px dashed #000; margin: 7px 0; }
  .info div { margin-bottom: 1px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; border-bottom: 1px solid #000; padding: 3px 2px; }
  td { padding: 3px 2px; vertical-align: top; }
  .qty { width: 30px; }
  .num { text-align: right; white-space: nowrap; }
  .sub { font-size: 10.5px; }
  .note { font-size: 10.5px; font-style: italic; }
  .big { font-size: 14px; }
  tfoot td { padding-top: 4px; }
  tfoot tr:first-child td { border-top: 1px dashed #000; padding-top: 6px; }
  tfoot .grand td { border-top: 1px solid #000; font-size: 14px; font-weight: bold; padding-top: 5px; }
  footer { text-align: center; margin-top: 10px; font-size: 11px; }
  @page { margin: 0; size: 80mm auto; }
  @media print { body { padding: 4mm; } }
</style></head><body>${body}</body></html>`;
}

/* ==========================================================================
   ছাপা — লুকানো iframe এ, তাই অ্যাপের স্ক্রিন কাঁপে না
   ========================================================================== */
export function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";

  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(frame);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  // ছবি (লোগো) নামার আগে ছাপা শুরু হলে সেটা বাদ পড়ে যায়
  const start = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    // প্রিন্ট ডায়ালগ বন্ধ হওয়ার সময় নেই — একটু পরে সরিয়ে দিই
    setTimeout(() => frame.remove(), 1000);
  };

  if (frame.contentWindow?.document.readyState === "complete") {
    setTimeout(start, 60);
  } else {
    frame.onload = () => setTimeout(start, 60);
  }
}
