import Image from "next/image";
import Link from "next/link";
import {
  Award,
  ChefHat,
  Clock3,
  Flame,
  Heart,
  Leaf,
  MapPin,
  Phone,
  Quote,
  Shield,
  Sparkles,
  Truck,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import type { IRestaurantSettings } from "@/src/interfaces/settings.interface";
import {
  openingRows,
  socialLinks,
  telHref,
  toParagraphs,
} from "@/src/lib/restaurantInfo";
import SocialIcon from "../Shared/SocialIcons";
import OpenNowBadge from "../Shared/OpenNowBadge";

import coverFallback from "@/src/assets/bannerimage/section_bg1.jpg";
import storyFallback from "@/src/assets/bannerimage/section_bg2.jpg";

import "./aboutPage.css";

/* ==========================================================================
   ABOUT — দোকানের নিজের গল্প
   --------------------------------------------------------------------------
   পাতার একটা লেখাও এখানে হার্ডকোড করা নেই; সবই রেস্টুরেন্ট সেটিংস থেকে
   আসে (ড্যাশবোর্ড → Settings → About page)। ম্যানেজার যেটা ফাঁকা রেখে
   দেয়, সেই সেকশনটা নিজে থেকেই লুকিয়ে যায় — তাই আধা-ভরা পাতা কখনো
   দেখা যায় না।

   সেকশনের ক্রম:
     হিরো → সংখ্যা → গল্প → কেন আমরা → সময়রেখা → শেফ → গ্যালারি → ভিজিট

   ছবি না থাকলে সাথের দুটো বান্ডিল করা ছবি ফলব্যাক হিসেবে বসে, তাই
   একদম নতুন ইনস্টলেও পাতাটা ভরা দেখায়।

   এটা সার্ভার কম্পোনেন্ট — ভেতরে শুধু "এখন খোলা?" ব্যাজটাই ক্লায়েন্ট,
   কারণ ওটার জন্য ব্রাউজারের ঘড়ি লাগে।
   ========================================================================== */

/** ডাটাবেসে শুধু আইকনের নামটা থাকে — কম্পোনেন্টে বদলানোর কাজটা এখানে */
const ICON_MAP: Record<string, LucideIcon> = {
  chef: ChefHat,
  leaf: Leaf,
  flame: Flame,
  heart: Heart,
  award: Award,
  clock: Clock3,
  truck: Truck,
  shield: Shield,
  sparkles: Sparkles,
  utensils: UtensilsCrossed,
};

interface AboutPageViewProps {
  settings: IRestaurantSettings;
}

export default function AboutPageView({ settings }: AboutPageViewProps) {
  const { about, restaurant_name: name } = settings;

  const storyParts = toParagraphs(about.story);
  const highlights = about.highlights.filter((item) => item.title.trim());
  const stats = about.stats.filter((item) => item.value.trim());
  const milestones = about.milestones.filter((item) => item.title.trim());
  const gallery = about.gallery.filter(Boolean);
  const hours = openingRows(settings.opening_hours);
  const socials = socialLinks(settings.socials);

  /* শেফের ব্লকটা তখনই অর্থবহ, যখন অন্তত নাম বা উক্তিটা আছে */
  const showChef = Boolean(about.chef_name.trim() || about.chef_quote.trim());

  return (
    <div className="about-page">
      {/* ================================================================
          হিরো — চওড়া ছবি, তার উপরে পর্দা আর লেখা
          ================================================================ */}
      <header className="about-hero">
        <div className="about-hero__media">
          <Image
            src={about.cover_image || coverFallback}
            alt={`${name} — restaurant interior`}
            fill
            // হিরো ছবিটাই পাতার LCP, তাই আগে থেকেই লোড হোক
            priority
            sizes="100vw"
            className="about-hero__image"
          />
          <span className="about-hero__veil" aria-hidden="true" />
        </div>

        <div className="about-hero__inner max-width">
          {/* ছোট পথনির্দেশ — অতিথি কোথায় আছে বুঝতে পারে */}
          <nav className="about-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">About</span>
          </nav>

          <span className="site-eyebrow about-hero__eyebrow">
            {about.eyebrow}
          </span>

          <h1 className="about-hero__title">{about.headline}</h1>

          {about.intro && <p className="about-hero__intro">{about.intro}</p>}

          <div className="about-hero__actions">
            <Link href="/foods" className="site-btn site-btn-primary about-btn">
              <UtensilsCrossed aria-hidden="true" />
              Explore the menu
            </Link>
            <Link href="/contact" className="about-btn about-btn--glass">
              <Phone aria-hidden="true" />
              Talk to us
            </Link>
          </div>

          {about.founded_year && (
            <span className="about-hero__since">
              <Sparkles aria-hidden="true" />
              Serving since {about.founded_year}
            </span>
          )}
        </div>
      </header>

      {/* ================================================================
          সংখ্যায় গল্প — হিরোর নিচ থেকে অর্ধেকটা উঠে থাকে
          ================================================================ */}
      {stats.length > 0 && (
        <section className="about-stats max-width" aria-label="At a glance">
          {stats.map((stat) => (
            <div key={stat.label} className="about-stat">
              <span className="about-stat__value">{stat.value}</span>
              <span className="about-stat__label">{stat.label}</span>
            </div>
          ))}
        </section>
      )}

      {/* ================================================================
          গল্প — বাঁয়ে ছবি, ডানে লেখা
          ================================================================ */}
      {(storyParts.length > 0 || about.story_title) && (
        <section className="about-story max-width">
          <div className="about-story__media">
            <div className="about-story__frame">
              <Image
                src={about.story_image || storyFallback}
                alt={`Inside the ${name} kitchen`}
                fill
                sizes="(min-width: 1024px) 46vw, 100vw"
                className="about-story__image"
              />
            </div>

            {about.founded_year && (
              <span className="about-story__badge" aria-hidden="true">
                <strong>{about.founded_year}</strong>
                <span>since</span>
              </span>
            )}

            {/* সাজের ছোট বলয় — পড়ার পথে আসে না */}
            <span className="about-story__ring" aria-hidden="true" />
          </div>

          <div className="about-story__text">
            <span className="site-eyebrow">Our kitchen</span>
            <h2 className="about-section__title">{about.story_title}</h2>

            {storyParts.map((part, index) => (
              <p key={index} className="about-story__para">
                {part}
              </p>
            ))}

            <Link href="/foods" className="about-inline-link">
              Taste what we cook
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      )}

      {/* ================================================================
          কেন আমরা — আইকন কার্ড
          ================================================================ */}
      {highlights.length > 0 && (
        <section className="about-values">
          <div className="max-width">
            <div className="about-section__head">
              <span className="site-eyebrow">What we stand for</span>
              <h2 className="about-section__title">
                প্রতিটা প্লেটের পেছনের নিয়মগুলো
              </h2>
            </div>

            <ul className="about-values__grid">
              {highlights.map((item) => {
                const Icon = ICON_MAP[item.icon] || UtensilsCrossed;

                return (
                  <li key={item.title} className="about-value">
                    <span className="about-value__icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <h3 className="about-value__title">{item.title}</h3>
                    <p className="about-value__text">{item.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {/* ================================================================
          সময়রেখা
          ================================================================ */}
      {milestones.length > 0 && (
        <section className="about-timeline max-width">
          <div className="about-section__head">
            <span className="site-eyebrow">The road so far</span>
            <h2 className="about-section__title">যেভাবে এতদূর আসা</h2>
          </div>

          <ol className="about-timeline__list">
            {milestones.map((step) => (
              <li key={`${step.year}-${step.title}`} className="about-step">
                <span className="about-step__year">{step.year}</span>
                <span className="about-step__dot" aria-hidden="true" />
                <div className="about-step__card">
                  <h3 className="about-step__title">{step.title}</h3>
                  <p className="about-step__text">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ================================================================
          শেফের কথা
          ================================================================ */}
      {showChef && (
        <section className="about-chef">
          <div className="about-chef__inner max-width">
            {about.chef_image && (
              <div className="about-chef__portrait">
                <Image
                  src={about.chef_image}
                  alt={about.chef_name || "Head chef"}
                  fill
                  sizes="(min-width: 768px) 260px, 180px"
                  className="about-chef__image"
                />
              </div>
            )}

            <blockquote className="about-chef__quote">
              <Quote className="about-chef__mark" aria-hidden="true" />
              <p>{about.chef_quote}</p>

              <footer className="about-chef__by">
                <strong>{about.chef_name || name}</strong>
                {about.chef_title && <span>{about.chef_title}</span>}
              </footer>
            </blockquote>
          </div>
        </section>
      )}

      {/* ================================================================
          গ্যালারি — প্রথম ছবিটা দুই ঘর জুড়ে বসে
          ================================================================ */}
      {gallery.length > 0 && (
        <section className="about-gallery max-width">
          <div className="about-section__head">
            <span className="site-eyebrow">A look inside</span>
            <h2 className="about-section__title">আমাদের ঘরটা এমন</h2>
          </div>

          <div className="about-gallery__grid">
            {gallery.slice(0, 7).map((src, index) => (
              <figure
                key={src}
                className={`about-gallery__item${
                  index === 0 ? " about-gallery__item--wide" : ""
                }`}
              >
                <Image
                  src={src}
                  alt={`${name} gallery photo ${index + 1}`}
                  fill
                  sizes="(min-width: 768px) 33vw, 50vw"
                  className="about-gallery__image"
                />
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ================================================================
          ভিজিট — ঠিকানা, সময়, সোশ্যাল
          ================================================================ */}
      <section className="about-visit">
        <div className="about-visit__inner max-width">
          <div className="about-visit__text">
            <span className="site-eyebrow">Come say hi</span>
            <h2 className="about-section__title">টেবিলটা আপনার জন্যই রাখা</h2>

            <ul className="about-visit__facts">
              {settings.address && (
                <li>
                  <MapPin aria-hidden="true" />
                  <span>{settings.address}</span>
                </li>
              )}
              {settings.phone && (
                <li>
                  <Phone aria-hidden="true" />
                  <a href={telHref(settings.phone)}>{settings.phone}</a>
                </li>
              )}
            </ul>

            <div className="about-visit__actions">
              <Link
                href="/contact"
                className="site-btn site-btn-primary about-btn"
              >
                Contact & directions
              </Link>
              <Link href="/foods" className="about-btn about-btn--outline">
                Order online
              </Link>
            </div>

            {socials.length > 0 && (
              <div className="about-visit__socials">
                <span>Follow the kitchen</span>
                <ul>
                  {socials.map((social) => (
                    <li key={social.platform}>
                      <a
                        href={social.href}
                        aria-label={social.label}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <SocialIcon platform={social.platform} />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {hours.length > 0 && (
            <div className="about-hours">
              <div className="about-hours__head">
                <h3>Opening hours</h3>
                <OpenNowBadge hours={settings.opening_hours} />
              </div>

              <ul className="about-hours__list">
                {hours.map((row) => (
                  <li key={row.day}>
                    <span className="about-hours__day">{row.long}</span>
                    <span className="about-hours__dots" aria-hidden="true" />
                    {row.closed ? (
                      <span className="about-hours__closed">Closed</span>
                    ) : (
                      <span className="about-hours__time">{row.range}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
