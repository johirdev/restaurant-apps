import Link from "next/link";
import {
  CalendarClock,
  Mail,
  MapPin,
  Navigation,
  Phone,
  UtensilsCrossed,
} from "lucide-react";

import type { IRestaurantSettings } from "@/src/interfaces/settings.interface";
import {
  directionsHref,
  openingRows,
  socialLinks,
  telHref,
  whatsappHref,
} from "@/src/lib/restaurantInfo";
import SocialIcon from "../Shared/SocialIcons";
import OpenNowBadge from "../Shared/OpenNowBadge";
import ContactForm from "./ContactForm";

import "./contactPage.css";

/* ==========================================================================
   CONTACT — যোগাযোগ, ঠিকানা আর ম্যাপ
   --------------------------------------------------------------------------
   গঠন:  হিরো → যোগাযোগের কার্ড → ফর্ম + সময়সূচি → গুগল ম্যাপ

   সব তথ্য রেস্টুরেন্ট সেটিংস থেকে আসে (ড্যাশবোর্ড → Settings)। ফোন,
   ইমেইল বা সোশ্যাল — যেটা সেটিংসে ফাঁকা, সেটার কার্ডই দেখা যায় না,
   তাই কোথাও "N/A" লেখা কার্ড পড়ে থাকে না।

   পাতাটা সার্ভার কম্পোনেন্ট; ফর্ম আর "এখন খোলা?" ব্যাজ দুটোই আলাদা
   ক্লায়েন্ট কম্পোনেন্ট, তাই বাকি পাতার HTML সরাসরি সার্ভার থেকেই যায়।
   ========================================================================== */

interface ContactPageViewProps {
  settings: IRestaurantSettings;
}

export default function ContactPageView({ settings }: ContactPageViewProps) {
  const { contact, restaurant_name: name } = settings;

  const hours = openingRows(settings.opening_hours);
  const socials = socialLinks(settings.socials);
  const whatsapp = whatsappHref(settings.socials.whatsapp || "");
  const directions = directionsHref(contact.map_link, settings.address);
  const bookingPhone = contact.reservation_phone || settings.phone;

  return (
    <div className="contact-page">
      {/* ================================================================
          হিরো
          ================================================================ */}
      <header className="contact-hero">
        <span className="contact-hero__glow" aria-hidden="true" />

        <div className="contact-hero__inner max-width">
          <nav className="contact-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Contact</span>
          </nav>

          <span className="site-eyebrow">{contact.eyebrow}</span>
          <h1 className="contact-hero__title">{contact.headline}</h1>
          {contact.intro && (
            <p className="contact-hero__intro">{contact.intro}</p>
          )}
        </div>
      </header>

      {/* ================================================================
          যোগাযোগের কার্ড — যেটা সেটিংসে আছে শুধু সেটাই
          ================================================================ */}
      <section className="contact-cards max-width" aria-label="How to reach us">
        {settings.address && (
          <article className="contact-card">
            <span className="contact-card__icon">
              <MapPin aria-hidden="true" />
            </span>
            <h2 className="contact-card__title">Visit us</h2>
            <p className="contact-card__text">{settings.address}</p>

            {directions && (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-card__link"
              >
                Get directions
                <Navigation aria-hidden="true" />
              </a>
            )}
          </article>
        )}

        {settings.phone && (
          <article className="contact-card">
            <span className="contact-card__icon">
              <Phone aria-hidden="true" />
            </span>
            <h2 className="contact-card__title">Call us</h2>
            <p className="contact-card__text">
              <a href={telHref(settings.phone)}>{settings.phone}</a>
            </p>

            {/* বুকিংয়ের আলাদা নম্বর থাকলে সেটাও এখানেই */}
            {contact.reservation_phone &&
              contact.reservation_phone !== settings.phone && (
                <p className="contact-card__sub">
                  Bookings:{" "}
                  <a href={telHref(contact.reservation_phone)}>
                    {contact.reservation_phone}
                  </a>
                </p>
              )}

            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-card__link"
              >
                Chat on WhatsApp
              </a>
            )}
          </article>
        )}

        {settings.email && (
          <article className="contact-card">
            <span className="contact-card__icon">
              <Mail aria-hidden="true" />
            </span>
            <h2 className="contact-card__title">Email us</h2>
            <p className="contact-card__text">
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
            </p>
            <p className="contact-card__sub">
              বড় অর্ডার বা অনুষ্ঠানের খাবারের জন্য লিখুন।
            </p>
          </article>
        )}

        {bookingPhone && (
          <article className="contact-card contact-card--accent">
            <span className="contact-card__icon">
              <CalendarClock aria-hidden="true" />
            </span>
            <h2 className="contact-card__title">Book a table</h2>
            <p className="contact-card__text">
              এক ফোনেই টেবিল রাখা হয়ে যাবে — অপেক্ষা করতে হবে না।
            </p>
            <a href={telHref(bookingPhone)} className="contact-card__link">
              {bookingPhone}
              <Phone aria-hidden="true" />
            </a>
          </article>
        )}
      </section>

      {/* ================================================================
          ফর্ম + পাশে সময়সূচি ও সোশ্যাল
          ================================================================ */}
      <section className="contact-main max-width">
        <ContactForm responseNote={contact.response_note} />

        <aside className="contact-side">
          {hours.length > 0 && (
            <div className="contact-panel">
              <div className="contact-panel__head">
                <h3>Opening hours</h3>
                <OpenNowBadge hours={settings.opening_hours} />
              </div>

              <ul className="contact-hours">
                {hours.map((row) => (
                  <li key={row.day}>
                    <span className="contact-hours__day">{row.long}</span>
                    <span className="contact-hours__dots" aria-hidden="true" />
                    {row.closed ? (
                      <span className="contact-hours__closed">Closed</span>
                    ) : (
                      <span className="contact-hours__time">{row.range}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {socials.length > 0 && (
            <div className="contact-panel">
              <div className="contact-panel__head">
                <h3>Follow us</h3>
              </div>

              <p className="contact-panel__text">
                রোজকার স্পেশাল আর নতুন পদের খবর সবার আগে ওখানেই দিই।
              </p>

              <ul className="contact-socials">
                {socials.map((social) => (
                  <li key={social.platform}>
                    <a
                      href={social.href}
                      aria-label={social.label}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <SocialIcon platform={social.platform} />
                      <span>{social.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="contact-panel contact-panel--cta">
            <UtensilsCrossed aria-hidden="true" />
            <h3>ক্ষুধা লেগে গেছে?</h3>
            <p>উত্তরের অপেক্ষা না করে সরাসরি অর্ডার করে ফেলুন।</p>
            <Link href="/foods" className="site-btn site-btn-primary">
              Order online
            </Link>
          </div>
        </aside>
      </section>

      {/* ================================================================
          গুগল ম্যাপ
          ================================================================ */}
      {contact.map_embed && (
        <section className="contact-map" aria-label="Find us on the map">
          <div className="contact-map__frame">
            {/*
              iframe টা lazy — পাতার নিচে থাকে, তাই স্ক্রল করে ওখানে
              পৌঁছানোর আগে গুগলের ম্যাপ নামানোর দরকার নেই। এতে প্রথম
              লোডটা হালকা থাকে।

              referrerPolicy টা গুগলের নিজের embed কোড যা দেয় সেটাই।
            */}
            <iframe
              src={contact.map_embed}
              title={`${name} on Google Maps`}
              loading="lazy"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>

          {(settings.address || directions) && (
            <div className="contact-map__card">
              <span className="contact-map__icon">
                <MapPin aria-hidden="true" />
              </span>

              <div>
                <h3>{name}</h3>
                {settings.address && <p>{settings.address}</p>}
              </div>

              {directions && (
                <a
                  href={directions}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="site-btn site-btn-primary contact-map__btn"
                >
                  <Navigation aria-hidden="true" />
                  Directions
                </a>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
