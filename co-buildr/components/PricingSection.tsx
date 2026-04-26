// 'use client';

// import { useMemo, useState } from 'react';

// type Plan = {
//   name: string;
//   monthlyPrice: number;
//   features: string[];
//   highlighted?: boolean;
// };

// const plans: Plan[] = [
//   {
//     name: 'FREE',
//     monthlyPrice: 0,
//     features: [
//       '50 searches/month',
//       'Reddit posts only',
//       'Basic AI analysis (keyword match, basic summary)',
//       'Filters: keyword, subreddit, date range',
//       'Export: CSV and JSON',
//       'no user profiling',
//       'other platforms coming soon',
//     ],
//   },
//   {
//     name: 'PLUs',
//     monthlyPrice: 15,
//     highlighted: true,
//     features: [
//       '200 searches/month',
//       'Reddit posts + comments',
//       'AI summaries + pain point detection',
//       'Filters: advanced sorting, upvote threshold, flair filter',
//       'Export: CSV, JSON, Excel',
//       'No user profiling',
//       'other platforms coming soon',
//     ],
//   },
//   {
//     name: 'PRO',
//     monthlyPrice: 35,
//     features: [
//       '400 searches/month',
//       '200 results per search',
//       'Reddit + all future platforms (Discord, Twitter etc.)',
//       'Deep AI insights: sentiment, lead scoring, intent detection',
//       'Filters: all above + scheduled/automated runs',
//       'Export: all formats + bulk',
//       'User profiling + bulk export: YES',
//     ],
//   },
// ];

// function CheckIcon() {
//   return (
//     <svg className="h-5 w-5 flex-shrink-0 text-amber-500" viewBox="0 0 30 30" fill="none" aria-hidden="true">
//       <path
//         d="M10 14.7875L13.0959 17.8834C13.3399 18.1274 13.7353 18.1275 13.9794 17.8838L20.625 11.25M15 27.5C8.09644 27.5 2.5 21.9036 2.5 15C2.5 8.09644 8.09644 2.5 15 2.5C21.9036 2.5 27.5 8.09644 27.5 15C27.5 21.9036 21.9036 27.5 15 27.5Z"
//         stroke="currentColor"
//         strokeWidth="1.6"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//     </svg>
//   );
// }

// export default function PricingSection() {
//   const [yearly, setYearly] = useState(false);

//   const computedPlans = useMemo(
//     () =>
//       plans.map((plan) => {
//         const price = yearly ? Math.round(plan.monthlyPrice * 12 * 0.8) : plan.monthlyPrice;
//         return { ...plan, price };
//       }),
//     [yearly]
//   );

//   return (
//     <section className="py-24">
//       <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//         <div className="mb-12">
//           <h2 className="mb-4 text-center text-5xl font-bold text-white">Choose your plan</h2>
//           <p className="mb-9 text-center leading-6 text-gray-300">
//             7 days free trial. No credit card required.
//           </p>
//         </div>

//         <div className="space-y-8 lg:grid lg:grid-cols-3 lg:items-stretch lg:gap-6 lg:space-y-0 xl:gap-8">
//           {computedPlans.map((plan) => (
//             <article
//               key={plan.name}
//               className={`mx-auto flex w-full max-w-sm flex-col rounded-2xl p-6 shadow-xl shadow-black/40 transition-all duration-300 xl:px-10 xl:py-9 ${
//                 plan.highlighted
//                   ? 'border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15'
//                   : 'border border-white/10 bg-zinc-900 hover:bg-zinc-800'
//               }`}
//             >
//               {plan.highlighted && (
//                 <div className="-mx-6 -mt-6 mb-6 rounded-t-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-3 text-center text-xs font-bold tracking-widest text-white xl:-mx-10">
//                   MOST POPULAR
//                 </div>
//               )}

//               <h3 className="mb-3 text-2xl font-bold text-white">{plan.name}</h3>
//               <div className="mb-6 flex items-end">
//                 <span className="mr-2 text-6xl font-semibold text-amber-500">${plan.price}</span>
//                 <span className="text-xl text-gray-400">{yearly ? '/ year' : '/ month'}</span>
//               </div>

//               <ul className="mb-10 space-y-4 text-left text-sm text-gray-300">
//                 {plan.features.map((feature) => (
//                   <li key={feature} className="flex items-start gap-3">
//                     <CheckIcon />
//                     <span>{feature}</span>
//                   </li>
//                 ))}
//               </ul>

//               <button
//                 type="button"
//                 className="mt-auto rounded-full bg-amber-500 px-5 py-2.5 text-base font-semibold text-white shadow-lg shadow-amber-500/20 transition-all duration-300 hover:bg-amber-600"
//               >
//                 Choose {plan.name}
//               </button>
//             </article>
//           ))}
//         </div>

//         <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-gray-400">
//           Infrastructure cost per search is about $0.08 (Apify $0.075 + Groq ~$0.0002). During
//           early MVP, Groq free tier covers AI cost entirely.
//         </p>
//       </div>
//     </section>
//   );
// }



'use client';

type Feature = {
  text: string;
  included: boolean;
};

type Plan = {
  name: string;
  monthlyPrice: number;
  features: Feature[];
  highlighted?: boolean;
};

const plans: Plan[] = [
  {
    name: 'FREE',
    monthlyPrice: 0,
    features: [
      { text: '50 searches/month', included: true },
      { text: 'Reddit posts only', included: true },
      { text: 'Basic AI analysis (intent classification, AI summary)', included: true },
      { text: 'Filters: keyword, subreddit, date range', included: true },
      { text: 'Export: CSV and JSON', included: false },
      { text: 'User profiling', included: false },
      { text: 'Other platforms', included: false },
    ],
  },
  {
    name: 'PLUS',
    monthlyPrice: 10,
    highlighted: true,
    features: [
      { text: '200 searches/month', included: true },
      { text: 'Reddit posts + comments', included: true },
      { text: 'AI summaries + pain point detection', included: true },
      { text: 'Filters: advanced sorting, upvote threshold, flair filter', included: true },
      { text: 'Export: CSV, JSON, Excel', included: true },
      { text: 'User profiling', included: false },
      { text: 'Other platforms coming soon', included: true },
    ],
  },
  {
    name: 'PRO',
    monthlyPrice: 25,
    features: [
      { text: '400 searches/month', included: true },
      { text: '200 results per search', included: true },
      { text: 'Reddit + all future platforms (Discord, Twitter etc.)', included: true },
      { text: 'Deep AI insights: sentiment, lead scoring, intent detection', included: true },
      { text: 'Filters: all above + scheduled/automated runs', included: true },
      { text: 'Export: all formats + bulk', included: true },
      { text: 'User profiling + bulk export', included: true },
    ],
  },
];

function CheckIcon() {
  return (
    <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <path
        d="M10 14.7875L13.0959 17.8834C13.3399 18.1274 13.7353 18.1275 13.9794 17.8838L20.625 11.25M15 27.5C8.09644 27.5 2.5 21.9036 2.5 15C2.5 8.09644 8.09644 2.5 15 2.5C21.9036 2.5 27.5 8.09644 27.5 15C27.5 21.9036 27.5 15 27.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg className="mt-0.5 h-5 w-5 shrink-0 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function PricingSection() {
  const computedPlans = plans.map((plan) => ({ ...plan, price: plan.monthlyPrice }));

  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="mb-4 text-center text-5xl font-bold text-white">Choose your plan</h2>
          <p className="mb-9 text-center leading-6 text-gray-300">
            7 days free trial. No credit card required.
          </p>
        </div>

        <div className="space-y-8 lg:grid lg:grid-cols-3 lg:items-stretch lg:gap-6 lg:space-y-0 xl:gap-8">
          {computedPlans.map((plan) => (
            <article
              key={plan.name}
              className={`mx-auto flex w-full max-w-sm flex-col rounded-2xl p-6 shadow-xl shadow-black/40 transition-all duration-300 xl:px-10 xl:py-9 ${
                plan.highlighted
                  ? 'border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/15'
                  : 'border border-white/10 bg-zinc-900 hover:bg-zinc-800'
              }`}
            >
              {plan.highlighted && (
                <div className="-mx-6 -mt-6 mb-6 rounded-t-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-3 text-center text-xs font-bold tracking-widest text-white xl:-mx-10">
                  MOST POPULAR
                </div>
              )}

              <h3 className="mb-3 text-2xl font-bold text-white">{plan.name}</h3>
              <div className="mb-6 flex items-end">
                <span className="mr-2 text-6xl font-semibold text-amber-500">${plan.price}</span>
                <span className="text-xl text-gray-400">/ month</span>
              </div>

              <ul className="mb-10 space-y-4 text-left text-sm text-gray-300">
                {plan.features.map((feature) => (
                  <li key={feature.text} className="flex items-start gap-3">
                    {feature.included ? <CheckIcon /> : <CrossIcon />}
                    <span className={feature.included ? 'text-gray-300' : 'text-gray-500'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className="mt-auto rounded-full bg-amber-500 px-5 py-2.5 text-base font-semibold text-white shadow-lg shadow-amber-500/20 transition-all duration-300 hover:bg-amber-600"
              >
                Choose {plan.name}
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

