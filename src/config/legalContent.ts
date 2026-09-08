import type {
  ILegalPage,
  ILegalSection,
  LegalSlug,
} from "../interfaces/legal.interface";

/* ==========================================================================
   তিনটে আইনি পাতার শুরুর লেখা
   --------------------------------------------------------------------------
   ইনস্টলের পরপরই যেন পাতা তিনটে ফাঁকা না দেখায়, তাই এখানে পুরো খসড়াটা
   দুই ভাষায় লেখা আছে। ম্যানেজার ড্যাশবোর্ড থেকে যা খুশি বদলাতে পারেন —
   একবার সেভ করলেই ডাটাবেসের লেখাটাই সাইটে যায়, এই ফাইলটা আর লাগে না।

   ⚠️ এটা খসড়া, আইনি পরামর্শ নয়। নিজের দোকানের নিয়ম, ঠিকানা আর আইনজীবীর
   দেখা ভাষা বসিয়ে নেওয়াই ঠিক।
   ========================================================================== */

/** ছোট হাতিয়ার — সেকশন লিখতে গিয়ে বারবার একই আকার টাইপ করতে হয় না */
const section = (
  key: string,
  icon: ILegalSection["icon"],
  headingEn: string,
  headingBn: string,
  bodyEn: string,
  bodyBn: string,
): ILegalSection => ({
  key,
  icon,
  heading: { en: headingEn, bn: headingBn },
  body: { en: bodyEn, bn: bodyBn },
  style: {},
  status: "active",
});

/* ------------------------------------------------------------------ */
/* 1. PRIVACY POLICY                                                   */
/* ------------------------------------------------------------------ */

const PRIVACY_SECTIONS: ILegalSection[] = [
  section(
    "information-we-collect",
    "database",
    "Information we collect",
    "আমরা কী কী তথ্য নিই",
    `<p>We only ask for what an order actually needs:</p>
<ul>
<li><strong>Your details</strong> — name, mobile number, email address and delivery address.</li>
<li><strong>Order details</strong> — the dishes you chose, any note for the kitchen, the time and the amount.</li>
<li><strong>Account details</strong> — your password is stored encrypted, never as plain text.</li>
<li><strong>Device details</strong> — browser type, approximate location and IP address, used to keep the account safe.</li>
</ul>
<p>We never ask for your full card number, PIN or OTP. Nobody from our team will ever call you for those.</p>`,
    `<p>অর্ডারটা পৌঁছে দিতে যতটুকু দরকার, আমরা ঠিক ততটুকুই চাই:</p>
<ul>
<li><strong>আপনার পরিচয়</strong> — নাম, মোবাইল নম্বর, ইমেইল আর ডেলিভারির ঠিকানা।</li>
<li><strong>অর্ডারের বিবরণ</strong> — কোন খাবার নিলেন, রান্নাঘরের জন্য কোনো নোট, সময় আর টাকার অঙ্ক।</li>
<li><strong>অ্যাকাউন্টের তথ্য</strong> — পাসওয়ার্ড এনক্রিপ্ট করে রাখা হয়, কখনো সাদা লেখায় নয়।</li>
<li><strong>ডিভাইসের তথ্য</strong> — ব্রাউজার, আনুমানিক অবস্থান আর আইপি ঠিকানা; অ্যাকাউন্ট নিরাপদ রাখতে কাজে লাগে।</li>
</ul>
<p>আমরা কখনো আপনার কার্ডের পুরো নম্বর, পিন বা ওটিপি চাই না। আমাদের কেউ ফোন করে এগুলো চাইলে বুঝবেন সেটা আমরা নই।</p>`,
  ),
  section(
    "how-we-use",
    "utensils",
    "How we use it",
    "এই তথ্য দিয়ে আমরা কী করি",
    `<ul>
<li>Cooking and delivering the order you placed.</li>
<li>Sending you the order status — confirmed, cooking, on the way, delivered.</li>
<li>Printing your invoice and keeping the accounts that the tax rules require.</li>
<li>Answering you when you call or message about an order.</li>
<li>Making the menu better — which dishes people search for, which ones they send back.</li>
</ul>
<p>We do not sell your information to anybody. Ever.</p>`,
    `<ul>
<li>আপনার দেওয়া অর্ডারটা রান্না করে পৌঁছে দিতে।</li>
<li>অর্ডারের খবর জানাতে — কনফার্ম হলো, রান্না চলছে, পথে আছে, পৌঁছে গেছে।</li>
<li>আপনার ইনভয়েস ছাপতে আর ভ্যাট-আইনে যে হিসাব রাখতে হয় সেটা রাখতে।</li>
<li>অর্ডার নিয়ে ফোন বা মেসেজ করলে সেটার উত্তর দিতে।</li>
<li>মেনু আরও ভালো করতে — কোন খাবার মানুষ খোঁজেন, কোনটা ফেরত আসে।</li>
</ul>
<p>আপনার তথ্য আমরা কারো কাছে বিক্রি করি না। কখনোই না।</p>`,
  ),
  section(
    "payments",
    "card",
    "Payment information",
    "টাকা লেনদেনের তথ্য",
    `<p>Card, bKash and Nagad payments go straight to the payment provider — the numbers never touch our server. All we keep is the transaction id, the amount and whether it succeeded, so that we can match it against your bill and refund you if something goes wrong.</p>
<p>Cash on delivery leaves no payment record with us at all beyond the amount collected.</p>`,
    `<p>কার্ড, বিকাশ বা নগদের টাকা সরাসরি পেমেন্ট প্রতিষ্ঠানের কাছে যায় — নম্বরগুলো আমাদের সার্ভার ছুঁয়েও দেখে না। আমাদের কাছে থাকে শুধু লেনদেনের আইডি, টাকার অঙ্ক আর সফল হয়েছে কিনা — যাতে বিলের সাথে মিলিয়ে দেখতে পারি, দরকার হলে টাকা ফেরত দিতে পারি।</p>
<p>ক্যাশ অন ডেলিভারিতে টাকার অঙ্ক ছাড়া আর কোনো পেমেন্ট তথ্য আমাদের কাছে থাকে না।</p>`,
  ),
  section(
    "cookies",
    "cookie",
    "Cookies and your browser",
    "কুকি আর আপনার ব্রাউজার",
    `<p>We use a small number of cookies, and each one has a job:</p>
<ul>
<li><strong>Login cookie</strong> — keeps you signed in so you do not type your password on every visit.</li>
<li><strong>Cart storage</strong> — remembers what you added, even if you close the tab.</li>
<li><strong>Preferences</strong> — the language you picked on pages like this one.</li>
</ul>
<p>You can clear them any time from your browser settings. The site keeps working — you will just have to sign in and build your cart again.</p>`,
    `<p>আমরা অল্প কয়েকটা কুকি ব্যবহার করি, প্রতিটার আলাদা কাজ আছে:</p>
<ul>
<li><strong>লগইন কুকি</strong> — আপনি সাইন-ইন থাকেন, প্রতিবার পাসওয়ার্ড লিখতে হয় না।</li>
<li><strong>কার্টের তথ্য</strong> — ট্যাব বন্ধ করলেও কার্টে রাখা খাবার মনে থাকে।</li>
<li><strong>পছন্দ</strong> — এই পাতার মতো জায়গায় আপনি যে ভাষাটা বেছেছিলেন।</li>
</ul>
<p>ব্রাউজারের সেটিংস থেকে যেকোনো সময় মুছে ফেলতে পারেন। সাইট তাতে বন্ধ হয় না — শুধু আবার লগইন করে কার্টটা সাজিয়ে নিতে হয়।</p>`,
  ),
  section(
    "sharing",
    "share",
    "Who else sees your data",
    "আপনার তথ্য আর কে দেখে",
    `<p>Only the people who need it to get your food to you:</p>
<ul>
<li><strong>Our kitchen and delivery team</strong> — they see your name, address and phone number, nothing else.</li>
<li><strong>The payment provider</strong> — to take the payment and to send a refund back.</li>
<li><strong>The SMS provider</strong> — to send you the order code and the OTP.</li>
<li><strong>Government authorities</strong> — only when the law formally requires it.</li>
</ul>`,
    `<p>শুধু তাঁরাই, যাঁদের ছাড়া খাবারটা আপনার কাছে পৌঁছায় না:</p>
<ul>
<li><strong>আমাদের রান্নাঘর আর ডেলিভারি টিম</strong> — তাঁরা দেখেন আপনার নাম, ঠিকানা আর ফোন নম্বর, এর বেশি কিছু নয়।</li>
<li><strong>পেমেন্ট প্রতিষ্ঠান</strong> — টাকা নিতে আর ফেরত পাঠাতে।</li>
<li><strong>এসএমএস প্রতিষ্ঠান</strong> — অর্ডারের কোড আর ওটিপি পাঠাতে।</li>
<li><strong>সরকারি কর্তৃপক্ষ</strong> — কেবল যখন আইন আনুষ্ঠানিকভাবে চায়।</li>
</ul>`,
  ),
  section(
    "retention",
    "clock",
    "How long we keep it",
    "কতদিন আমরা তথ্য রাখি",
    `<ul>
<li><strong>Order and invoice records</strong> — kept as long as the tax rules require.</li>
<li><strong>Your account</strong> — until you ask us to delete it.</li>
<li><strong>OTP codes</strong> — deleted within minutes of being used.</li>
<li><strong>Delivery address</strong> — kept so your next order is faster; you can remove it from your account page.</li>
</ul>`,
    `<ul>
<li><strong>অর্ডার আর ইনভয়েসের হিসাব</strong> — ভ্যাট-আইন যতদিন রাখতে বলে ততদিন।</li>
<li><strong>আপনার অ্যাকাউন্ট</strong> — যতদিন না আপনি মুছে ফেলতে বলেন।</li>
<li><strong>ওটিপি কোড</strong> — ব্যবহার হওয়ার কয়েক মিনিটের মধ্যেই মুছে যায়।</li>
<li><strong>ডেলিভারির ঠিকানা</strong> — পরের অর্ডারটা দ্রুত করতে রেখে দিই; অ্যাকাউন্ট পাতা থেকে নিজেই সরাতে পারেন।</li>
</ul>`,
  ),
  section(
    "your-rights",
    "user",
    "Your rights",
    "আপনার অধিকার",
    `<p>At any time you can ask us to:</p>
<ul>
<li>Show you a copy of what we hold about you.</li>
<li>Fix anything that is wrong.</li>
<li>Delete your account and personal details, apart from the invoice records we are legally required to keep.</li>
<li>Stop sending you offer messages — you keep getting order updates, those are part of the service.</li>
</ul>
<p>Write to us and we will answer within seven working days.</p>`,
    `<p>যেকোনো সময় আপনি আমাদের বলতে পারেন:</p>
<ul>
<li>আপনার সম্পর্কে আমাদের কাছে যা আছে, তার একটা কপি দেখাতে।</li>
<li>ভুল কিছু থাকলে ঠিক করে দিতে।</li>
<li>অ্যাকাউন্ট আর ব্যক্তিগত তথ্য মুছে ফেলতে — আইনে যে ইনভয়েসের হিসাব রাখতেই হয়, সেটুকু বাদে।</li>
<li>অফারের মেসেজ পাঠানো বন্ধ করতে — অর্ডারের খবর কিন্তু আসতেই থাকবে, ওটা সেবারই অংশ।</li>
</ul>
<p>আমাদের লিখুন, সাত কর্মদিবসের মধ্যে উত্তর দেব।</p>`,
  ),
  section(
    "security",
    "lock",
    "Keeping it safe",
    "নিরাপত্তা",
    `<p>Passwords are hashed, the whole site runs over HTTPS, and the dashboard is locked behind roles — a chef sees the kitchen screen, not your phone number. Even so, no system online is perfect. If you think something is wrong with your account, change your password and tell us straight away.</p>`,
    `<p>পাসওয়ার্ড হ্যাশ করে রাখা, পুরো সাইট HTTPS-এ চলে, আর ড্যাশবোর্ডে রোল ধরে দরজা আটকানো — শেফ রান্নাঘরের স্ক্রিন দেখেন, আপনার ফোন নম্বর নয়। তবু অনলাইনে কোনো ব্যবস্থাই নিখুঁত নয়। অ্যাকাউন্টে গোলমাল মনে হলে সাথে সাথে পাসওয়ার্ড বদলে আমাদের জানান।</p>`,
  ),
  section(
    "children",
    "shield",
    "Children",
    "শিশুদের ব্যাপারে",
    `<p>This site is meant for people aged 13 and over. If a child has given us their details, write to us and we will delete them.</p>`,
    `<p>এই সাইটটা ১৩ বছর বা তার বেশি বয়সীদের জন্য। কোনো শিশু নিজের তথ্য দিয়ে ফেললে আমাদের জানান, আমরা মুছে দেব।</p>`,
  ),
  section(
    "changes",
    "refresh",
    "Changes to this policy",
    "নীতি বদলালে",
    `<p>When we change something here, the date at the top changes with it. Big changes get a notice on the site as well.</p>`,
    `<p>এখানে কিছু বদলালে উপরের তারিখটাও বদলে যায়। বড় ধরনের বদল হলে সাইটেও আলাদা করে জানিয়ে দেওয়া হয়।</p>`,
  ),
];

/* ------------------------------------------------------------------ */
/* 2. TERMS OF SERVICE                                                 */
/* ------------------------------------------------------------------ */

const TERMS_SECTIONS: ILegalSection[] = [
  section(
    "accepting",
    "scale",
    "Accepting these terms",
    "শর্ত মেনে নেওয়া",
    `<p>Browsing the menu, creating an account or placing an order means you accept what is written on this page. If a line here does not work for you, please do not place the order — call us instead and we will sort it out over the phone.</p>`,
    `<p>মেনু দেখা, অ্যাকাউন্ট খোলা কিংবা অর্ডার করা — এর যেকোনোটা করলেই ধরে নেওয়া হয় এই পাতার কথাগুলো আপনি মেনে নিয়েছেন। কোনো একটা শর্ত আপনার জন্য অসুবিধার হলে অর্ডার না করে বরং ফোন করুন, কথা বলেই মিটিয়ে ফেলি।</p>`,
  ),
  section(
    "account",
    "user",
    "Your account",
    "আপনার অ্যাকাউন্ট",
    `<ul>
<li>Give a real name and a mobile number that works — the rider will call it.</li>
<li>Your password is yours to protect. Anything ordered from your account is treated as ordered by you.</li>
<li>One person, one account. Accounts made to abuse offers get closed.</li>
<li>Tell us straight away if you think somebody else is using your account.</li>
</ul>`,
    `<ul>
<li>আসল নাম আর চালু মোবাইল নম্বর দিন — রাইডার ওই নম্বরেই ফোন করবেন।</li>
<li>পাসওয়ার্ডটা আপনারই দায়িত্ব। আপনার অ্যাকাউন্ট থেকে যা অর্ডার হয়, সেটা আপনার অর্ডার হিসেবেই ধরা হয়।</li>
<li>এক জনের এক অ্যাকাউন্ট। অফারের সুযোগ নিতে বানানো অ্যাকাউন্ট বন্ধ করে দেওয়া হয়।</li>
<li>অন্য কেউ আপনার অ্যাকাউন্ট ব্যবহার করছে মনে হলে সাথে সাথে জানান।</li>
</ul>`,
  ),
  section(
    "ordering",
    "utensils",
    "Placing an order",
    "অর্ডার করা",
    `<p>An order becomes ours to cook only when you see the confirmation on screen or in the SMS. Until then nothing is on the stove.</p>
<p>We may turn an order down when a dish has run out, the address is outside our delivery area, the phone number does not answer, or the order looks like a prank. If you have already paid, the money goes back in full.</p>`,
    `<p>স্ক্রিনে বা এসএমএসে কনফার্মেশন দেখলে তবেই অর্ডারটা আমাদের রান্নার দায়িত্বে আসে। তার আগে চুলায় কিছু ওঠে না।</p>
<p>খাবার ফুরিয়ে গেলে, ঠিকানা আমাদের ডেলিভারি এলাকার বাইরে হলে, ফোন নম্বরে কেউ সাড়া না দিলে বা অর্ডারটা মজা করে দেওয়া মনে হলে আমরা সেটা ফিরিয়ে দিতে পারি। টাকা দিয়ে থাকলে পুরোটাই ফেরত যায়।</p>`,
  ),
  section(
    "pricing",
    "card",
    "Prices, VAT and charges",
    "দাম, ভ্যাট আর চার্জ",
    `<ul>
<li>Menu prices are in Bangladeshi Taka.</li>
<li>VAT and service charge are shown separately on the bill before you pay — nothing is added afterwards.</li>
<li>Delivery fee depends on the distance, and is waived above the amount shown at checkout.</li>
<li>Prices can change without notice, but never after your order is confirmed.</li>
</ul>`,
    `<ul>
<li>মেনুর দাম বাংলাদেশি টাকায়।</li>
<li>ভ্যাট আর সার্ভিস চার্জ টাকা দেওয়ার আগেই বিলে আলাদা করে দেখানো হয় — পরে আর কিছু যোগ হয় না।</li>
<li>ডেলিভারি ফি দূরত্ব অনুযায়ী; চেকআউটে দেখানো অঙ্কের বেশি অর্ডারে ফি লাগে না।</li>
<li>দাম আগাম না জানিয়েও বদলাতে পারে, তবে অর্ডার কনফার্ম হয়ে যাওয়ার পর কখনোই নয়।</li>
</ul>`,
  ),
  section(
    "delivery",
    "truck",
    "Delivery, pickup and dine-in",
    "ডেলিভারি, পিকআপ আর ডাইন-ইন",
    `<p>The time shown at checkout is our honest estimate, not a promise — rain, traffic and a full kitchen all stretch it. We will call you if your order is running badly late.</p>
<p>Please be reachable on your phone. If the rider cannot find you after two calls and ten minutes of waiting, the order is treated as delivered and cannot be refunded.</p>
<p>Pickup orders are held hot for 30 minutes from the ready time.</p>`,
    `<p>চেকআউটে যে সময়টা দেখানো হয় সেটা আমাদের সৎ অনুমান, প্রতিশ্রুতি নয় — বৃষ্টি, জ্যাম আর ভরা রান্নাঘর সময় বাড়িয়ে দেয়। বেশি দেরি হলে আমরা নিজেরাই ফোন করে জানাই।</p>
<p>ফোনটা হাতের কাছে রাখুন। দুইবার ফোন করে আর দশ মিনিট অপেক্ষা করেও রাইডার আপনাকে না পেলে অর্ডারটা ডেলিভারি হয়েছে ধরা হয়, টাকা ফেরত হয় না।</p>
<p>পিকআপের অর্ডার তৈরি হওয়ার পর ৩০ মিনিট পর্যন্ত গরম রাখা হয়।</p>`,
  ),
  section(
    "changes-cancel",
    "ban",
    "Changing or cancelling",
    "অর্ডার বদল বা বাতিল",
    `<p>Call us the moment you change your mind. If the kitchen has not started, we cancel it free. Once cooking has started the food is already yours — see the <a href="/refund">refund policy</a> for what happens then.</p>`,
    `<p>মত বদলালে সাথে সাথে ফোন করুন। রান্না শুরু না হয়ে থাকলে বিনা খরচে বাতিল করে দিই। রান্না শুরু হয়ে গেলে খাবারটা আপনারই হয়ে গেছে — তখন কী হয় সেটা <a href="/refund">রিফান্ড নীতিতে</a> লেখা আছে।</p>`,
  ),
  section(
    "menu-photos",
    "file",
    "Menu, photos and availability",
    "মেনু, ছবি আর খাবার থাকা-না থাকা",
    `<p>Photos are of real food from our kitchen, but a plate is never an exact copy of a picture. Weights are before cooking. A dish can run out mid-service — when that happens we call you before charging anything extra.</p>`,
    `<p>ছবিগুলো আমাদের রান্নাঘরের আসল খাবারেরই, তবে প্লেট কখনো ছবির হুবহু নকল হয় না। ওজন রান্নার আগের। দিনের মাঝপথে কোনো খাবার ফুরিয়ে যেতে পারে — তখন বাড়তি টাকা কাটার আগে আমরা ফোন করে জানাই।</p>`,
  ),
  section(
    "allergens",
    "alert",
    "Allergies and food safety",
    "অ্যালার্জি আর খাদ্য নিরাপত্তা",
    `<p>One kitchen cooks everything, so nuts, dairy, egg, seafood and gluten are all around. We cannot promise any dish is completely free of a given ingredient.</p>
<p>If you have an allergy, write it in the order note <em>and</em> call us. Please eat the food within two hours, or refrigerate it.</p>`,
    `<p>সব রান্না একই রান্নাঘরে হয়, তাই বাদাম, দুধ, ডিম, সামুদ্রিক মাছ আর গ্লুটেন আশেপাশেই থাকে। কোনো খাবারে নির্দিষ্ট উপাদান একেবারেই নেই — এই কথা আমরা দিতে পারি না।</p>
<p>অ্যালার্জি থাকলে অর্ডারের নোটে লিখুন <em>এবং</em> ফোনেও জানান। খাবারটা দুই ঘণ্টার মধ্যে খেয়ে ফেলুন, নয়তো ফ্রিজে রাখুন।</p>`,
  ),
  section(
    "reviews",
    "check",
    "Reviews and what you post",
    "রিভিউ আর আপনার লেখা",
    `<p>Write honestly — good or bad, we would rather know. We remove reviews only when they carry abuse, personal details of somebody else, or are clearly fake. Posting a review gives us permission to show it on the site.</p>`,
    `<p>সৎভাবে লিখুন — ভালো হোক বা খারাপ, আমরা জানতে চাই। রিভিউ শুধু তখনই সরাই যখন তাতে গালাগাল থাকে, অন্য কারো ব্যক্তিগত তথ্য থাকে, বা লেখাটা স্পষ্ট বানানো। রিভিউ দিলে সেটা সাইটে দেখানোর অনুমতি আমরা পেয়ে যাই।</p>`,
  ),
  section(
    "acceptable-use",
    "ban",
    "Fair use",
    "সাইট ব্যবহারের নিয়ম",
    `<p>Please do not order under a false name, hammer the site with scripted requests, try to break into other accounts, or copy our photos and menu text for another business.</p>`,
    `<p>ভুয়া নামে অর্ডার করা, স্ক্রিপ্ট দিয়ে সাইটে চাপ দেওয়া, অন্যের অ্যাকাউন্টে ঢোকার চেষ্টা, কিংবা আমাদের ছবি আর মেনুর লেখা নিজের ব্যবসায় বসিয়ে নেওয়া — এগুলো করবেন না।</p>`,
  ),
  section(
    "liability",
    "shield",
    "What we are responsible for",
    "আমাদের দায়",
    `<p>If we get something wrong, our responsibility is limited to the value of that order — we refund it, replace it, or both. We are not liable for things outside our hands: a strike, a flood, a power cut or a payment gateway going down.</p>`,
    `<p>আমাদের ভুল হলে দায়টা ওই অর্ডারের টাকার অঙ্কের মধ্যেই সীমাবদ্ধ — টাকা ফেরত দিই, নতুন করে পাঠাই, কিংবা দুটোই। হাতের বাইরের ঘটনার দায় আমাদের নয়: হরতাল, বন্যা, বিদ্যুৎ চলে যাওয়া বা পেমেন্ট গেটওয়ে বসে যাওয়া।</p>`,
  ),
  section(
    "law",
    "scale",
    "Governing law",
    "প্রযোজ্য আইন",
    `<p>These terms follow the laws of Bangladesh, and any dispute belongs to the courts of Dhaka. But please talk to us first — almost everything gets settled over a phone call.</p>`,
    `<p>এই শর্তগুলো বাংলাদেশের আইন অনুযায়ী চলে, আর কোনো বিরোধ হলে সেটা ঢাকার আদালতের এখতিয়ারে। তবে আগে আমাদের সাথে কথা বলুন — প্রায় সবকিছুই এক ফোনেই মিটে যায়।</p>`,
  ),
];

/* ------------------------------------------------------------------ */
/* 3. REFUND POLICY                                                    */
/* ------------------------------------------------------------------ */

const REFUND_SECTIONS: ILegalSection[] = [
  section(
    "promise",
    "check",
    "Our promise",
    "আমাদের কথা",
    `<p>If the food that reaches you is not the food we meant to send, we make it right. No long forms, no arguing — one phone call is enough.</p>`,
    `<p>যে খাবারটা আপনার কাছে পৌঁছাল সেটা যদি আমাদের পাঠানোর কথা ছিল না, আমরা সেটা ঠিক করে দিই। লম্বা ফর্ম নেই, তর্ক নেই — একটা ফোনই যথেষ্ট।</p>`,
  ),
  section(
    "eligible",
    "refresh",
    "When we refund",
    "কখন টাকা ফেরত হয়",
    `<ul>
<li>The wrong dish arrived, or an item was missing from the bag.</li>
<li>The food arrived cold, spilled or spoiled.</li>
<li>There is something in the food that should not be there.</li>
<li>The order never arrived at all.</li>
<li>You were charged twice for the same order.</li>
<li>We cancelled your order after taking payment.</li>
</ul>
<p>Please tell us within <strong>two hours</strong> of delivery, and keep the food until we have seen a photo — that is how we work out what went wrong in the kitchen.</p>`,
    `<ul>
<li>ভুল খাবার এসেছে, কিংবা ব্যাগে একটা আইটেম নেই।</li>
<li>খাবার ঠান্ডা, ছড়িয়ে যাওয়া বা নষ্ট অবস্থায় এসেছে।</li>
<li>খাবারের ভেতরে এমন কিছু আছে যা থাকার কথা নয়।</li>
<li>অর্ডারটা একেবারেই পৌঁছায়নি।</li>
<li>একই অর্ডারের টাকা দুইবার কাটা হয়েছে।</li>
<li>টাকা নেওয়ার পর আমরা নিজেরাই অর্ডার বাতিল করেছি।</li>
</ul>
<p>ডেলিভারির <strong>দুই ঘণ্টার</strong> মধ্যে আমাদের জানান, আর ছবি দেখানো পর্যন্ত খাবারটা রেখে দিন — এভাবেই আমরা বুঝতে পারি রান্নাঘরে কোথায় ভুলটা হলো।</p>`,
  ),
  section(
    "not-eligible",
    "ban",
    "When we cannot refund",
    "কখন টাকা ফেরত হয় না",
    `<ul>
<li>The dish simply was not to your taste, though it was cooked as described.</li>
<li>You ordered the wrong item and the kitchen had already cooked it.</li>
<li>The address or phone number given was wrong, so the rider could not deliver.</li>
<li>Nobody was there to take the order after two calls.</li>
<li>The whole plate was eaten and the complaint came afterwards.</li>
<li>The complaint came more than 24 hours after delivery.</li>
</ul>`,
    `<ul>
<li>খাবারটা যেমন বলা ছিল তেমনই রান্না হয়েছে, শুধু আপনার মুখে ধরেনি।</li>
<li>আপনি ভুল আইটেম অর্ডার করেছেন আর রান্নাঘর সেটা রেঁধে ফেলেছে।</li>
<li>ঠিকানা বা ফোন নম্বর ভুল দেওয়ায় রাইডার পৌঁছাতে পারেননি।</li>
<li>দুইবার ফোন করেও খাবারটা নেওয়ার মতো কাউকে পাওয়া যায়নি।</li>
<li>পুরো প্লেট খাওয়ার পর অভিযোগ এসেছে।</li>
<li>ডেলিভারির ২৪ ঘণ্টা পেরিয়ে যাওয়ার পর অভিযোগ এসেছে।</li>
</ul>`,
  ),
  section(
    "how-to-ask",
    "mail",
    "How to ask for a refund",
    "কীভাবে টাকা ফেরত চাইবেন",
    `<ol>
<li>Call or message us with your order number — it is on the confirmation SMS and on your account page.</li>
<li>Send a photo of the food as it arrived.</li>
<li>Tell us in one line what went wrong.</li>
</ol>
<p>We answer the same day. Most cases are decided while you are still on the phone.</p>`,
    `<ol>
<li>অর্ডার নম্বরটা নিয়ে ফোন বা মেসেজ করুন — নম্বরটা কনফার্মেশন এসএমএসে আর আপনার অ্যাকাউন্ট পাতায় আছে।</li>
<li>খাবারটা যেভাবে পৌঁছেছে তার একটা ছবি পাঠান।</li>
<li>এক লাইনে বলুন সমস্যাটা কী।</li>
</ol>
<p>একই দিনেই উত্তর দিই। বেশিরভাগ ক্ষেত্রে ফোনে কথা বলতে বলতেই সিদ্ধান্ত হয়ে যায়।</p>`,
  ),
  section(
    "timeline",
    "clock",
    "How long the money takes",
    "টাকা ফিরতে কত দিন",
    `<ul>
<li><strong>bKash / Nagad</strong> — 1 to 3 working days.</li>
<li><strong>Card</strong> — 5 to 10 working days, depending on your bank.</li>
<li><strong>Cash on delivery</strong> — the rider hands it back on the spot, or we send it to your mobile wallet the same day.</li>
<li><strong>Store credit</strong> — instantly, if you would rather have that.</li>
</ul>
<p>Once we have sent the money the bank takes over, and that part is out of our hands.</p>`,
    `<ul>
<li><strong>বিকাশ / নগদ</strong> — ১ থেকে ৩ কর্মদিবস।</li>
<li><strong>কার্ড</strong> — আপনার ব্যাংক অনুযায়ী ৫ থেকে ১০ কর্মদিবস।</li>
<li><strong>ক্যাশ অন ডেলিভারি</strong> — রাইডার তখনই হাতে ফিরিয়ে দেন, নয়তো একই দিনে মোবাইল ওয়ালেটে পাঠিয়ে দিই।</li>
<li><strong>স্টোর ক্রেডিট</strong> — সাথে সাথেই, যদি আপনি সেটাই বেশি পছন্দ করেন।</li>
</ul>
<p>টাকা পাঠিয়ে দেওয়ার পর ব্যাংকের সময়টা আর আমাদের হাতে থাকে না।</p>`,
  ),
  section(
    "cancel-before",
    "clock",
    "Cancelling before we cook",
    "রান্না শুরুর আগে বাতিল",
    `<p>Cancel while the order still says <em>pending</em> or <em>confirmed</em> and you get every taka back, delivery fee included. Once the kitchen screen shows <em>cooking</em>, the ingredients are already in the pan and the order cannot be cancelled for free.</p>`,
    `<p>অর্ডারে যতক্ষণ <em>pending</em> বা <em>confirmed</em> লেখা, ততক্ষণ বাতিল করলে ডেলিভারি ফি সহ প্রতিটা টাকা ফেরত পাবেন। রান্নাঘরের স্ক্রিনে <em>cooking</em> উঠে গেলে উপকরণ কড়াইয়ে চলে গেছে, তখন আর বিনা খরচে বাতিল হয় না।</p>`,
  ),
  section(
    "failed-payments",
    "card",
    "Failed and duplicate payments",
    "ব্যর্থ বা দুইবার কাটা টাকা",
    `<p>If money left your account but the order never appeared, do not order again — call us with the transaction id. Failed payments usually bounce back on their own within 72 hours; duplicates we return the same day we confirm them.</p>`,
    `<p>টাকা কেটে গেছে অথচ অর্ডারটা দেখাচ্ছে না — আবার অর্ডার করবেন না, লেনদেনের আইডি নিয়ে আমাদের ফোন করুন। ব্যর্থ পেমেন্ট সাধারণত ৭২ ঘণ্টার মধ্যে নিজে থেকেই ফিরে যায়; দুইবার কাটা টাকা আমরা মিলিয়ে দেখেই সেদিনই ফেরত পাঠাই।</p>`,
  ),
  section(
    "partial",
    "utensils",
    "Partial refunds and replacements",
    "আংশিক ফেরত আর বদলে দেওয়া",
    `<p>If one dish out of four was wrong, we refund that dish, not the whole bill. Where it makes more sense we cook the item again and send it out — you choose which one you would rather have.</p>`,
    `<p>চারটার মধ্যে একটা খাবার ভুল হলে আমরা ওই খাবারটার টাকা ফেরত দিই, পুরো বিলের নয়। যেখানে বেশি মানানসই, সেখানে আইটেমটা আবার রেঁধে পাঠিয়ে দিই — কোনটা নেবেন সেটা আপনার পছন্দ।</p>`,
  ),
  section(
    "escalate",
    "help",
    "If you are still not happy",
    "তবু সমাধান না হলে",
    `<p>Ask for the manager. If that still does not settle it, write to us by email and the owner reads it. We would rather lose the money than lose you.</p>`,
    `<p>ম্যানেজারের সাথে কথা বলতে চান বলুন। তাতেও না মিটলে ইমেইলে লিখুন, মালিক নিজে পড়েন। টাকাটা হারানো আমাদের কাছে আপনাকে হারানোর চেয়ে ভালো।</p>`,
  ),
];

/* ------------------------------------------------------------------ */
/* পুরো পাতা                                                          */
/* ------------------------------------------------------------------ */

/** সব পাতাতেই এক রকম — তাই একবারই লেখা */
const BASE_THEME: ILegalPage["theme"] = {
  accent: "",
  hero_background: "",
  hero_ink: "",
  body_size: "16px",
  line_height: "1.85",
  content_width: "760px",
  font: "sans",
  show_toc: true,
  show_contact: true,
  show_print: true,
  show_lang_switch: true,
};

export const DEFAULT_LEGAL_PAGES: Record<LegalSlug, ILegalPage> = {
  privacy: {
    slug: "privacy",
    title: { en: "Privacy policy", bn: "গোপনীয়তা নীতি" },
    subtitle: {
      en: "What we ask for, why we ask, and what we never do with it.",
      bn: "কী চাই, কেন চাই, আর কোন কাজটা আমরা কখনোই করি না।",
    },
    intro: {
      en: `<p>You hand over a name, a number and an address so that hot food can find your door. This page says exactly what happens to those three things after you press <strong>Place order</strong> — in plain words, not legal ones.</p>`,
      bn: `<p>গরম খাবারটা যেন আপনার দরজা খুঁজে পায়, সেজন্যই আপনি একটা নাম, একটা নম্বর আর একটা ঠিকানা দেন। <strong>অর্ডার করুন</strong> চাপার পর ওই তিনটে জিনিসের সাথে ঠিক কী হয়, এই পাতায় সেটাই লেখা — আইনের ভাষায় নয়, সোজা কথায়।</p>`,
    },
    sections: PRIVACY_SECTIONS,
    contact: { email: "", phone: "", address: { en: "", bn: "" } },
    seo: {
      meta_title: { en: "Privacy policy", bn: "গোপনীয়তা নীতি" },
      meta_description: {
        en: "How we collect, use and protect the details you share when you order food from us.",
        bn: "আমাদের কাছে খাবার অর্ডার করলে আপনার দেওয়া তথ্য আমরা কীভাবে নিই, ব্যবহার করি আর নিরাপদ রাখি।",
      },
    },
    theme: { ...BASE_THEME },
    default_lang: "en",
    status: "published",
  },

  terms: {
    slug: "terms",
    title: { en: "Terms of service", bn: "সেবার শর্তাবলি" },
    subtitle: {
      en: "The house rules — ordering, delivery, prices and what we owe each other.",
      bn: "ঘরের নিয়ম — অর্ডার, ডেলিভারি, দাম আর একে অপরের কাছে আমাদের দায়।",
    },
    intro: {
      en: `<p>Nobody enjoys reading terms. We have kept these short and written them the way we would explain them across the counter. Order from us and these are the rules we both follow.</p>`,
      bn: `<p>শর্তাবলি পড়তে কারোরই ভালো লাগে না। তাই আমরা এগুলো ছোট রেখেছি, আর এমনভাবে লিখেছি যেভাবে কাউন্টারে দাঁড়িয়ে বুঝিয়ে বলতাম। আমাদের কাছে অর্ডার করলে এই নিয়মগুলোই আমরা দুজনেই মানি।</p>`,
    },
    sections: TERMS_SECTIONS,
    contact: { email: "", phone: "", address: { en: "", bn: "" } },
    seo: {
      meta_title: { en: "Terms of service", bn: "সেবার শর্তাবলি" },
      meta_description: {
        en: "The rules for ordering, delivery, pricing, cancellations and fair use of our restaurant app.",
        bn: "আমাদের রেস্টুরেন্ট অ্যাপে অর্ডার, ডেলিভারি, দাম, বাতিল আর ব্যবহারের নিয়মকানুন।",
      },
    },
    theme: { ...BASE_THEME },
    default_lang: "en",
    status: "published",
  },

  refund: {
    slug: "refund",
    title: { en: "Refund policy", bn: "রিফান্ড নীতি" },
    subtitle: {
      en: "When we give the money back, how fast, and how to ask.",
      bn: "কখন টাকা ফেরত দিই, কত দ্রুত, আর কীভাবে চাইবেন।",
    },
    intro: {
      en: `<p>Food is not a shirt — you cannot send it back and put it on the shelf again. So our rule is simple: if the mistake is ours, the money is yours. This page says what counts as our mistake.</p>`,
      bn: `<p>খাবার তো আর জামা নয় — ফেরত দিয়ে আবার তাকে তুলে রাখা যায় না। তাই আমাদের নিয়মটা সহজ: ভুলটা আমাদের হলে টাকাটা আপনার। কোনটাকে আমাদের ভুল বলা হবে, এই পাতায় সেটাই লেখা।</p>`,
    },
    sections: REFUND_SECTIONS,
    contact: { email: "", phone: "", address: { en: "", bn: "" } },
    seo: {
      meta_title: { en: "Refund policy", bn: "রিফান্ড নীতি" },
      meta_description: {
        en: "When you can get a refund on a food order, how to request one, and how long the money takes.",
        bn: "খাবারের অর্ডারে কখন টাকা ফেরত পাওয়া যায়, কীভাবে চাইতে হয় আর টাকা ফিরতে কত দিন লাগে।",
      },
    },
    theme: { ...BASE_THEME },
    default_lang: "en",
    status: "published",
  },
};

/** নতুন সেকশন যোগ করলে যে খালি ছাঁচটা বসে */
export const EMPTY_SECTION = (key: string): ILegalSection => ({
  key,
  icon: "file",
  heading: { en: "", bn: "" },
  body: { en: "", bn: "" },
  style: {},
  status: "active",
});
