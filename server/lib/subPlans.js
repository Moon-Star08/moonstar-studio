/* The subscribable care plans. Prices live ONLY here on the server — the
   browser never sends an amount. Keep slugs stable (used in the DB + URLs). */
'use strict';

const PLANS = [
  {
    slug: 'essential-care',
    name: 'Essential Care',
    price: 50,
    currency: 'USD',
    frequency: '1M',
    blurb: "Perfect for small business websites that don't change very often.",
    features: [
      'Website monitoring', 'Monthly security check', 'Monthly backup',
      'Monthly updates', 'Minor bug fixes', 'Up to 30 mins content updates', 'Replace up to 5 images',
    ],
  },
  {
    slug: 'business-care',
    name: 'Business Care',
    price: 85,
    currency: 'USD',
    frequency: '1M',
    blurb: 'Ideal for growing businesses that update their website regularly.',
    features: [
      'Weekly security scans', 'Weekly backups', 'Weekly updates',
      'Up to 1.5 hours content updates', 'Replace up to 15 images', 'Monthly speed optimization',
      'Monthly SEO health check', 'Uptime monitoring', 'Monthly maintenance report', 'Priority email support (24 hrs)',
    ],
  },
  {
    slug: 'premium-care',
    name: 'Premium Care',
    price: 120,
    currency: 'USD',
    frequency: '1M',
    blurb: 'For businesses that rely on their website every day and need fast, priority support.',
    features: [
      'Daily backups', 'Weekly performance optimization', 'Up to 3 hours content updates',
      'Unlimited image replacements', 'Priority bug fixing', 'Emergency website recovery',
      'Weekly SEO monitoring', 'Detailed monthly performance report', 'Same business day priority support', 'Consultation for improvements',
    ],
  },
];

const BY_SLUG = Object.fromEntries(PLANS.map((p) => [p.slug, p]));

function publicPlans() {
  return PLANS.map((p) => ({ slug: p.slug, name: p.name, price: p.price, currency: p.currency, frequency: p.frequency, blurb: p.blurb, features: p.features }));
}
function getPlan(slug) { return BY_SLUG[slug] || null; }

module.exports = { PLANS, publicPlans, getPlan };
