"use client";


import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { A11y, Autoplay, Keyboard } from "swiper/modules";
import type { Swiper as SwiperClass } from "swiper";

import FoodCard, { FoodItem } from "../FoodItems/FoodCard";
import { DRINKS_CATEGORY_ID } from "@/src/config/site";

import "./coolDrinks.css";

interface CoolDrinksProps {
  /** সার্ভারে তোলা পানীয়ের তালিকা */
  drinks: FoodItem[];
}

const DRINK_SKELETON_COUNT = 5;

export const CoolDrinksSkeleton = () => (
  <section className="cool-drinks" aria-busy="true" aria-label="Loading drinks">
    <div className="max-width px-4 sm:px-6">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <div className="skeleton h-3 w-28 rounded-xs" />
          <div className="skeleton mt-3 h-10 w-64 rounded-xs" />
          <div className="skeleton mt-3 h-4 w-80 max-w-full rounded-xs" />
        </div>
        <div className="skeleton hidden h-11 w-36 rounded-sm md:block" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: DRINK_SKELETON_COUNT }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="skeleton aspect-4/3 w-full" />
            <div className="space-y-3 p-4">
              <div className="skeleton h-4 w-4/5 rounded-xs" />
              <div className="skeleton h-3 w-1/2 rounded-xs" />
              <div className="skeleton h-9 w-full rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/** স্লাইডার এক ধাপ এগোনোর বিরতি */
const AUTOPLAY_DELAY = 4500;

const CoolDrinks = ({ drinks }: CoolDrinksProps) => {
  const [swiper, setSwiper] = useState<SwiperClass | null>(null);

  /**
   * সব কার্ড এক পর্দাতেই ধরে গেলে Swiper নিজেকে "locked" করে রাখে —
   * তখন তীর চাপলে কিছুই হয় না। শুরুতে দোকানে দু-তিনটে পানীয় থাকলে
   * ঠিক সেটাই হতো: দুটো অকেজো বোতাম বসে থাকত। তাই সরানোর মতো কিছু
   * থাকলে তবেই তীর দুটো দেখা যায়, আর পানীয় বাড়লে নিজে থেকেই ফিরে আসে।
   */
  const [canScroll, setCanScroll] = useState(false);
  const syncNav = (instance: SwiperClass) => setCanScroll(!instance.isLocked);

  // পানীয় না থাকলে সেকশনটা একেবারেই আসে না — হোমপেজে ফাঁকা শিরোনাম
  // ঝুলে থাকার চেয়ে সেটাই ভালো
  if (!drinks.length) return null;

  /**
   * লুপ তখনই, যখন এক পর্দায় যা ধরে তার চেয়ে বেশি কার্ড আছে। কম থাকলে
   * Swiper লুপ করতে গিয়ে কার্ড নকল করে আর ফাঁকা জায়গা রেখে দেয়।
   */
  const canLoop = drinks.length > 4;

  const seeAllHref = `/foods?category_id=${DRINKS_CATEGORY_ID}&page=1`;

  return (
    <section className="cool-drinks">
      <div className="max-width px-4 sm:px-6">
        {/* ---------------- HEADER ---------------- */}
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="site-eyebrow">Chilled &amp; fresh</p>
            <h2 className="mt-1 font-display text-3xl font-extrabold text-ink sm:text-4xl">
              Cool Drinks &amp; Juice
            </h2>
            <p className="mt-1.5 text-[14px] text-ink-soft">
              Freshly squeezed juices and ice-cold drinks to go with your meal.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* তীর দুটো শুধু চওড়া পর্দায়, আর তখনই যখন সরানোর মতো কার্ড
                আছে — নিচে স্লাইডারই নেই, তাই তীরও থাকা উচিত নয় */}
            <div
              className={`items-center gap-2 ${canScroll ? "hidden lg:flex" : "hidden"}`}
            >
              <button
                type="button"
                aria-label="Previous drinks"
                onClick={() => swiper?.slidePrev()}
                className="cool-drinks__nav"
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next drinks"
                onClick={() => swiper?.slideNext()}
                className="cool-drinks__nav"
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </div>

            <Link
              href={seeAllHref}
              className="site-btn site-btn-outline h-11 px-6 text-[13px]"
            >
              See all drinks <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* ---------------- চওড়া পর্দা: স্লাইডার ---------------- */}
        <div className="hidden lg:block">
          <Swiper
            className="cool-drinks__swiper"
            modules={[Autoplay, A11y, Keyboard]}
            onSwiper={(instance) => {
              setSwiper(instance);
              syncNav(instance);
            }}
            // পর্দার মাপ বা কার্ডের সংখ্যা বদলালে তীরের হিসাবটাও বদলায়
            onResize={syncNav}
            onBreakpoint={syncNav}
            onUpdate={syncNav}
            slidesPerView={4}
            spaceBetween={18}
            loop={canLoop}
            speed={600}
            keyboard={{ enabled: true }}
            /**
             * মাউস উপরে থাকলে স্লাইড থামে — কেউ একটা কার্ড পড়তে গিয়ে
             * সেটা সরে যাওয়ার চেয়ে বিরক্তিকর কিছু নেই।
             */
            autoplay={
              canLoop
                ? { delay: AUTOPLAY_DELAY, disableOnInteraction: false, pauseOnMouseEnter: true }
                : false
            }
            /**
             * ব্লকটা lg এর নিচে `display:none` থাকে। পর্দা বড় করলে
             * Swiper কে নতুন মাপটা জানতে হয়, নাহলে কার্ডের প্রস্থ ০ ধরে
             * বসে থাকত।
             */
            observer
            observeParents
            breakpoints={{
              1024: { slidesPerView: 3, spaceBetween: 18 },
              1440: { slidesPerView: 4, spaceBetween: 20 },
            }}
          >
            {drinks.map((drink) => (
              <SwiperSlide key={drink._id}>
                <FoodCard food={drink} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* ---------------- ছোট পর্দা: সাধারণ গ্রিড ---------------- */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:hidden">
          {drinks.map((drink) => (
            <FoodCard key={drink._id} food={drink} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoolDrinks;
