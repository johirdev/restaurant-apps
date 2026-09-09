"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { CheckCircle2, Loader2, Send } from "lucide-react";

import { apiPost, getApiErrorMessage } from "@/src/lib/apiClient";
import {
  createContactMessageSchema,
  MESSAGE_WORD_LIMIT,
  type CreateContactMessageInput,
  type CreateContactMessagePayload,
} from "@/src/validations/contactMessage.schema";
import { countWords } from "@/src/lib/textGuard";
import {
  CONTACT_TOPICS,
  CONTACT_TOPIC_LABEL,
  type ContactTopic,
} from "@/src/interfaces/contactMessage.interface";

/* ==========================================================================
   CONTACT FORM
   --------------------------------------------------------------------------
   যাচাইয়ের নিয়মগুলো সার্ভারের সাথে হুবহু এক — দুই জায়গাতেই
   `createContactMessageSchema` চলে। তাই ব্রাউজারে যে বার্তা দেখা যায়,
   সার্ভারও ঠিক সেটাই বলে; নিয়ম বদলাতে হলে একটাই ফাইল ছুঁতে হয়।

   পাঠানোর পর ফর্মটা একটা "পৌঁছে গেছে" পর্দায় বদলে যায়। অতিথি চাইলে
   সেখান থেকেই আরেকটা বার্তা লিখতে পারে — পাতা রিফ্রেশ করতে হয় না।
   ========================================================================== */

interface ContactFormProps {
  /** ফর্মের নিচে দেখানো আশ্বাসের লাইন — সেটিংস থেকে আসে */
  responseNote: string;
}

export default function ContactForm({ responseNote }: ContactFormProps) {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateContactMessageInput, unknown, CreateContactMessagePayload>({
    resolver: zodResolver(createContactMessageSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      topic: "general",
      subject: "",
      message: "",
      website: "",
    },
  });

  /**
   * লেখা অবস্থাতেই শব্দ গোনা। সীমা ছাড়ালে জমা দেওয়ার সময় স্কিমা তো
   * আটকাবেই, কিন্তু ৬০০ শব্দ লিখে ফেলার পরে "৫০০ শব্দের বেশি নয়"
   * শোনাটা বিরক্তিকর — গোনাটা চোখের সামনে থাকলে সেটা আর হয় না।
   */
  const message = useWatch({ control, name: "message" });
  const wordCount = countWords(message || "");

  const onSubmit = async (values: CreateContactMessagePayload) => {
    try {
      const res = await apiPost("/api/v1/contact", values);
      toast.success(res.message || "Message sent");
      reset();
      setSent(true);
    } catch (err) {
      // থ্রটল (429) বা ভ্যালিডেশন — সার্ভারের নিজের বার্তাটাই সবচেয়ে কাজের
      toast.error(getApiErrorMessage(err, "Could not send your message"));
    }
  };

  if (sent) {
    return (
      <div className="contact-form contact-form--done">
        <span className="contact-done__icon">
          <CheckCircle2 aria-hidden="true" />
        </span>
        <h3 className="contact-done__title">বার্তাটা পৌঁছে গেছে</h3>
        <p className="contact-done__text">{responseNote}</p>

        <button
          type="button"
          onClick={() => setSent(false)}
          className="site-btn site-btn-outline contact-done__again"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h3 className="contact-form__title">Send us a message</h3>
      <p className="contact-form__hint">
        মাঠগুলো ভরে পাঠিয়ে দিন — বাকিটা আমরা দেখছি।
      </p>

      <div className="contact-form__grid">
        <Field label="Your name" error={errors.name?.message} required>
          <input
            {...register("name")}
            placeholder="Full name"
            autoComplete="name"
            className={`site-input contact-input${errors.name ? " is-invalid" : ""}`}
          />
        </Field>

        <Field label="Email" error={errors.email?.message} required>
          <input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            className={`site-input contact-input${errors.email ? " is-invalid" : ""}`}
          />
        </Field>

        <Field label="Phone (optional)" error={errors.phone?.message}>
          <input
            {...register("phone")}
            placeholder="01712345678"
            inputMode="tel"
            autoComplete="tel"
            className={`site-input contact-input${errors.phone ? " is-invalid" : ""}`}
          />
        </Field>

        <Field label="What is it about?" error={errors.topic?.message}>
          <select
            {...register("topic")}
            className={`site-input contact-input contact-select${
              errors.topic ? " is-invalid" : ""
            }`}
          >
            {CONTACT_TOPICS.map((topic) => (
              <option key={topic} value={topic}>
                {CONTACT_TOPIC_LABEL[topic as ContactTopic]}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Subject (optional)"
          error={errors.subject?.message}
          full
        >
          <input
            {...register("subject")}
            placeholder="A booking for six on Friday"
            className={`site-input contact-input${errors.subject ? " is-invalid" : ""}`}
          />
        </Field>

        <Field label="Message" error={errors.message?.message} required full>
          <textarea
            {...register("message")}
            rows={5}
            placeholder="Tell us what you need — in plain words, no links please."
            className={`site-input contact-input contact-textarea${
              errors.message ? " is-invalid" : ""
            }`}
          />

          <span
            className={`contact-field__count${
              wordCount > MESSAGE_WORD_LIMIT ? " is-over" : ""
            }`}
          >
            {wordCount} / {MESSAGE_WORD_LIMIT} words · links are not allowed
          </span>
        </Field>
      </div>

      {/* মধুর ফাঁদ — মানুষ এটা দেখতেই পায় না, বট ভরে ফেলে আর ধরা পড়ে।
          `display:none` নয়, কারণ কিছু বট লুকোনো মাঠ এড়িয়ে যায়। */}
      <div className="contact-form__trap" aria-hidden="true">
        <label htmlFor="contact-website">Do not fill this in</label>
        <input
          id="contact-website"
          {...register("website")}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="site-btn site-btn-primary contact-form__submit"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="contact-form__spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          <>
            <Send aria-hidden="true" />
            Send message
          </>
        )}
      </button>

      <p className="contact-form__note">{responseNote}</p>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* লেবেল + এরর — একটাই ছাঁচ, তাই প্রতিটা মাঠ একরকম দেখায়              */
/* ------------------------------------------------------------------ */
function Field({
  label,
  error,
  required,
  full,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  /** পুরো সারি জুড়ে বসবে কিনা */
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`contact-field${full ? " contact-field--full" : ""}`}>
      <span className="contact-field__label">
        {label}
        {required && <i aria-hidden="true">*</i>}
      </span>

      {children}

      {error && <span className="contact-field__error">{error}</span>}
    </label>
  );
}
