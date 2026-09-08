/* ==========================================================================
   HTML SANITIZER
   --------------------------------------------------------------------------
   আইনি পাতাগুলোর লেখা ড্যাশবোর্ডের রিচ-টেক্সট এডিটর থেকে HTML হয়ে আসে,
   আর সাইটে সেটা `dangerouslySetInnerHTML` দিয়ে বসে। মাঝখানে এই ফাইলটাই
   একমাত্র পাহারা — তাই ছাঁকাটা সার্ভারে হয় (সার্ভিস লেয়ারে), ব্রাউজারে নয়।

   নিয়মটা সাদা-তালিকার: যে ট্যাগ, যে অ্যাট্রিবিউট আর যে CSS প্রপার্টি
   নিচে লেখা নেই — সেটা বাদ। ফলে নতুন কোনো আক্রমণের কৌশল বেরোলেও সেটা
   নিজে থেকেই আটকে যায়, আলাদা করে ব্ল্যাকলিস্টে যোগ করতে হয় না।

   ম্যানেজার ছাড়া কেউ এখানে লিখতে পারে না — তবু এটা রাখা হয়েছে, কারণ
   একটা অ্যাডমিন অ্যাকাউন্ট হাতছাড়া হলে যেন সেটা পুরো সাইটের প্রতিটা
   দর্শকের ব্রাউজারে স্ক্রিপ্ট চালানোর দরজা হয়ে না দাঁড়ায়।
   ========================================================================== */

/** নিজে বন্ধ হয় — `</br>` লিখতে হয় না */
const VOID_TAGS = new Set(["br", "hr", "wbr"]);

/**
 * যেসব ট্যাগ পেলে ভেতরের লেখাসহ পুরোটা ফেলে দেওয়া হয়।
 * (বাকি অচেনা ট্যাগে শুধু ট্যাগটা যায়, ভেতরের লেখা থেকে যায়।)
 */
const DROP_WITH_CONTENT = new Set([
  "script",
  "style",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "applet",
  "noscript",
  "template",
  "svg",
  "math",
  "form",
  "input",
  "button",
  "select",
  "option",
  "textarea",
  "link",
  "meta",
  "base",
  "head",
  "title",
]);

/** ট্যাগ → যে অ্যাট্রিবিউটগুলো টিকে থাকে */
const ALLOWED_TAGS: Record<string, readonly string[]> = {
  p: ["style"],
  div: ["style"],
  span: ["style"],
  br: [],
  hr: ["style"],

  h2: ["style", "id"],
  h3: ["style", "id"],
  h4: ["style", "id"],
  h5: ["style", "id"],
  h6: ["style", "id"],

  strong: ["style"],
  b: ["style"],
  em: ["style"],
  i: ["style"],
  u: ["style"],
  s: ["style"],
  strike: ["style"],
  del: ["style"],
  ins: ["style"],
  mark: ["style"],
  small: ["style"],
  sub: ["style"],
  sup: ["style"],
  code: ["style"],
  pre: ["style"],
  abbr: ["style", "title"],

  ul: ["style"],
  ol: ["style", "start"],
  li: ["style"],
  dl: ["style"],
  dt: ["style"],
  dd: ["style"],

  blockquote: ["style"],
  figure: ["style"],
  figcaption: ["style"],

  a: ["href", "target", "rel", "title", "style"],

  table: ["style"],
  thead: ["style"],
  tbody: ["style"],
  tfoot: ["style"],
  tr: ["style"],
  th: ["style", "colspan", "rowspan"],
  td: ["style", "colspan", "rowspan"],
  caption: ["style"],
};

/**
 * `style=""` এ যে প্রপার্টিগুলো থাকতে পারে।
 * ম্যানেজার এডিটরের টুলবার থেকে যা যা বদলাতে পারেন — ফন্ট সাইজ, রঙ,
 * হাইলাইট, লাইনের ফাঁক, অক্ষরের ফাঁক, অ্যালাইনমেন্ট, মার্জিন — সবগুলোই
 * এই তালিকায় আছে। `position`, `z-index` জাতীয় লেআউট ভাঙার প্রপার্টি নেই।
 */
const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "background",
  "background-color",
  "font-size",
  "font-weight",
  "font-style",
  "font-family",
  "font-variant",
  "text-align",
  "text-decoration",
  "text-decoration-line",
  "text-decoration-color",
  "text-transform",
  "text-indent",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "white-space",
  "vertical-align",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-color",
  "border-style",
  "border-width",
  "border-radius",
  "list-style-type",
  "list-style-position",
  "opacity",
  "max-width",
  "width",
  "display",
]);

/** `display:` এ শুধু নিরীহ মানগুলো — `display:none` দিয়ে লেখা লুকানো ঠেকাতে */
const ALLOWED_DISPLAY = new Set([
  "inline",
  "inline-block",
  "block",
  "list-item",
  "table",
  "table-row",
  "table-cell",
]);

/* ------------------------------------------------------------------ */
/* ছোট হাতিয়ার                                                        */
/* ------------------------------------------------------------------ */

/** অ্যাট্রিবিউটের ভেতরে বসানোর আগে */
const escapeAttr = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/**
 * এনটিটি খুলে দেখা।
 * `href="java&#115;cript:…"` ব্রাউজার নিজে খুলে নেয়, তাই যাচাইয়ের আগে
 * আমাদেরও খুলে নিতে হয় — নাহলে যাচাইটা ফাঁকি দেওয়া যায়।
 */
const decodeEntities = (value: string) =>
  value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return "";
      }
    })
    .replace(/&#(\d+);?/g, (_, dec) => {
      try {
        return String.fromCodePoint(parseInt(dec, 10));
      } catch {
        return "";
      }
    })
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");

/** টেক্সট নোড — অসম্পূর্ণ `<` গুলো নিরীহ করে দেওয়া হয় */
const escapeText = (value: string) => value.replace(/</g, "&lt;");

/* ------------------------------------------------------------------ */
/* style="" ছাঁকা                                                      */
/* ------------------------------------------------------------------ */

const sanitizeStyle = (raw: string): string => {
  const kept: string[] = [];

  for (const declaration of decodeEntities(raw).split(";")) {
    const colon = declaration.indexOf(":");
    if (colon < 0) continue;

    const prop = declaration.slice(0, colon).trim().toLowerCase();
    if (!ALLOWED_STYLE_PROPS.has(prop)) continue;

    let value = declaration.slice(colon + 1).trim();
    if (!value || value.length > 120) continue;

    // `!important` রাখলে সাইটের নিজের CSS টপকে যায় — চুপচাপ ফেলে দিই
    value = value.replace(/!\s*important/gi, "").trim();
    if (!value) continue;

    const lower = value.toLowerCase();
    // ছবি/স্ক্রিপ্ট টেনে আনার সব পথ
    if (
      lower.includes("url(") ||
      lower.includes("expression") ||
      lower.includes("javascript:") ||
      lower.includes("@import") ||
      lower.includes("image-set")
    ) {
      continue;
    }

    // অক্ষর, সংখ্যা, রঙের কোড আর `var(--x)` / `rgb(…)` — এর বাইরে কিছু নয়
    if (!/^[a-zA-Z0-9\s#%.,()\-_'"/+]+$/.test(value)) continue;

    if (prop === "display" && !ALLOWED_DISPLAY.has(lower)) continue;

    kept.push(`${prop}: ${value}`);
  }

  return kept.join("; ");
};

/* ------------------------------------------------------------------ */
/* href="" ছাঁকা                                                       */
/* ------------------------------------------------------------------ */

/** নিরাপদ লিংক হলে পরিষ্কার করা ঠিকানা, নাহলে null */
const sanitizeHref = (raw: string): string | null => {
  // ট্যাব বা নাল বাইট গুঁজে `java&#9;script:` লেখা যায় — ব্রাউজার ওগুলো
  // উপেক্ষা করে চালিয়ে দেয়, তাই যাচাইয়ের আগে আমরাও ফেলে দিই।
  const value = Array.from(decodeEntities(raw))
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code > 0x20 && code !== 0x7f;
    })
    .join("");

  if (!value || value.length > 500) return null;
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(value)) return value;

  return null;
};

/* ------------------------------------------------------------------ */
/* অ্যাট্রিবিউট ছাঁকা                                                  */
/* ------------------------------------------------------------------ */

const ATTR_PATTERN =
  /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const sanitizeAttributes = (tag: string, rawAttrs: string): string => {
  const allowed = ALLOWED_TAGS[tag];
  if (!allowed || allowed.length === 0) return "";

  const out: string[] = [];
  let isBlankTarget = false;

  ATTR_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = ATTR_PATTERN.exec(rawAttrs)) !== null) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";

    if (!allowed.includes(name)) continue;

    switch (name) {
      case "style": {
        const style = sanitizeStyle(value);
        if (style) out.push(`style="${escapeAttr(style)}"`);
        break;
      }

      case "href": {
        const href = sanitizeHref(value);
        if (href) out.push(`href="${escapeAttr(href)}"`);
        break;
      }

      case "target": {
        // `_blank` ছাড়া অন্য কোনো টার্গেটের দরকার নেই
        if (value.trim().toLowerCase() === "_blank") {
          isBlankTarget = true;
          out.push(`target="_blank"`);
        }
        break;
      }

      case "rel":
        // নিচে নিজেরাই বসাই — এখানে যা এসেছে তা ফেলে দিই
        break;

      case "id": {
        const id = value.trim();
        if (/^[a-zA-Z][a-zA-Z0-9_-]{0,60}$/.test(id)) {
          out.push(`id="${escapeAttr(id)}"`);
        }
        break;
      }

      case "colspan":
      case "rowspan":
      case "start": {
        const num = value.trim();
        if (/^\d{1,3}$/.test(num)) out.push(`${name}="${num}"`);
        break;
      }

      case "title": {
        // আগে খুলে, তারপর আবার বন্ধ করি — নাহলে `&quot;` লেখা থাকলে সেটা
        // প্রতিবার সেভে `&amp;quot;` হয়ে লম্বা হতে থাকত
        const title = decodeEntities(value).trim().slice(0, 200);
        if (title) out.push(`title="${escapeAttr(title)}"`);
        break;
      }

      default:
        break;
    }
  }

  // নতুন ট্যাবে খোলা লিংক থেকে `window.opener` এর দরজা বন্ধ করা
  if (isBlankTarget) out.push(`rel="noopener noreferrer"`);

  return out.length ? " " + out.join(" ") : "";
};

/* ------------------------------------------------------------------ */
/* মূল কাজ                                                             */
/* ------------------------------------------------------------------ */

const TOKEN_PATTERN =
  /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!?\/?([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

/**
 * এডিটরের HTML কে নিরাপদ HTML এ রূপান্তর করে।
 *
 * - চেনা ট্যাগ থাকে, তার শুধু সাদা-তালিকার অ্যাট্রিবিউট নিয়ে
 * - `<script>` জাতীয় ট্যাগ ভেতরের লেখাসহ উধাও
 * - বাকি অচেনা ট্যাগে শুধু ট্যাগটা যায়, লেখাটা থেকে যায়
 * - খোলা ট্যাগ শেষে নিজে থেকেই বন্ধ হয়, বেমানান বন্ধ-ট্যাগ ফেলে দেওয়া হয়
 */
export function sanitizeHtml(input: string): string {
  if (!input) return "";

  const source = String(input);
  const out: string[] = [];
  /** এখনো বন্ধ হয়নি এমন ট্যাগ, শেষেরটা আগে */
  const open: string[] = [];

  /** `<script>` এর ভেতরে ঢুকে পড়লে কোন ট্যাগ বন্ধ হওয়ার অপেক্ষায় আছি */
  let skipUntil: string | null = null;
  let cursor = 0;

  TOKEN_PATTERN.lastIndex = 0;
  let token: RegExpExecArray | null;

  while ((token = TOKEN_PATTERN.exec(source)) !== null) {
    const [full, tagName, rawAttrs] = token;
    const start = token.index;

    // ট্যাগের আগের সাধারণ লেখা
    if (start > cursor && !skipUntil) {
      out.push(escapeText(source.slice(cursor, start)));
    }
    cursor = start + full.length;

    // কমেন্ট / CDATA / doctype — সবই বাদ
    if (!tagName) continue;

    const tag = tagName.toLowerCase();
    const isClosing = full.startsWith("</");

    /* ---- বাদ দেওয়া ব্লকের ভেতরে আছি ---- */
    if (skipUntil) {
      if (isClosing && tag === skipUntil) skipUntil = null;
      continue;
    }

    /* ---- ভেতরের লেখাসহ ফেলে দেওয়ার ট্যাগ ---- */
    if (DROP_WITH_CONTENT.has(tag)) {
      // নিজে বন্ধ হয়ে থাকলে (<meta …/>) ভেতর বলে কিছু নেই
      if (!isClosing && !full.endsWith("/>")) skipUntil = tag;
      continue;
    }

    /* ---- অচেনা ট্যাগ — মোড়কটা ফেলে দিই, লেখা থাকুক ---- */
    if (!ALLOWED_TAGS[tag]) continue;

    /* ---- বন্ধ ট্যাগ ---- */
    if (isClosing) {
      if (VOID_TAGS.has(tag)) continue;

      const depth = open.lastIndexOf(tag);
      // যে ট্যাগ কখনো খোলাই হয়নি, তার বন্ধ-ট্যাগ রাখার মানে নেই
      if (depth < 0) continue;

      // মাঝখানে খোলা থাকা ট্যাগগুলোও একসাথে বন্ধ করে দিই (<b><i></b>)
      for (let i = open.length - 1; i >= depth; i--) out.push(`</${open[i]}>`);
      open.length = depth;
      continue;
    }

    /* ---- খোলা ট্যাগ ---- */
    const attrs = sanitizeAttributes(tag, rawAttrs || "");

    if (VOID_TAGS.has(tag)) {
      out.push(`<${tag}${attrs} />`);
      continue;
    }

    out.push(`<${tag}${attrs}>`);
    open.push(tag);
  }

  // শেষ ট্যাগের পরের লেখা
  if (cursor < source.length && !skipUntil) {
    out.push(escapeText(source.slice(cursor)));
  }

  // যা খোলা রয়ে গেল, বন্ধ করে দিই — নাহলে পাতার বাকি অংশ ভেতরে ঢুকে যায়
  for (let i = open.length - 1; i >= 0; i--) out.push(`</${open[i]}>`);

  return out.join("").trim();
}

/**
 * HTML থেকে শুধু লেখা — মেটা ডেসক্রিপশন আর ড্যাশবোর্ডের ছোট প্রিভিউতে লাগে।
 */
export function htmlToText(input: string, limit = 0): string {
  if (!input) return "";

  const text = decodeEntities(
    String(input)
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();

  if (limit > 0 && text.length > limit) {
    return text.slice(0, limit).replace(/\s+\S*$/, "") + "…";
  }
  return text;
}
