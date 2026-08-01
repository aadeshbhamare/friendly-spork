import { Check, Sparkles, Crown, Building2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

const PLANS = [
  { id: 'free', name: 'Free', price: '$0', icon: Sparkles, features: ['10 credits / month', '720p export', '5 visual styles', 'Watermark-free'], cta: 'Current Plan', current: true },
  { id: 'pro', name: 'Pro', price: '$19', icon: Zap, features: ['100 credits / month', '1080p export', 'All 25+ styles', 'AI chatbot assistant', 'Version history', 'Priority support'], cta: 'Upgrade to Pro', featured: true },
  { id: 'business', name: 'Business', price: '$49', icon: Building2, features: ['500 credits / month', '4K export', 'Timeline editor', 'Priority rendering', 'Custom assets', 'Team sharing'], cta: 'Upgrade to Business' },
  { id: 'enterprise', name: 'Enterprise', price: 'Custom', icon: Crown, features: ['Unlimited credits', '8K export', 'API access', 'Dedicated support', 'Custom AI models', 'SLA guarantee'], cta: 'Contact Sales' },
];

export function BillingPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold">Billing & Plans</h1>
        <p className="text-surface-700 mt-1">Choose the plan that fits your creative needs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={cn(
              'card p-6 flex flex-col',
              plan.featured && 'border-primary-500/30 shadow-glow',
              plan.current && 'opacity-70'
            )}
          >
            {plan.featured && <div className="badge bg-primary-500/15 text-primary-300 self-start mb-3">Most Popular</div>}
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center mb-3">
              <plan.icon className="w-5 h-5 text-primary-400" />
            </div>
            <h3 className="font-display font-bold text-lg mb-1">{plan.name}</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold">{plan.price}</span>
              {plan.price !== 'Custom' && plan.price !== '$0' && <span className="text-sm text-surface-700">/mo</span>}
            </div>
            <ul className="space-y-2.5 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-surface-800">
                  <Check className="w-4 h-4 text-success-400 mt-0.5 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button
              disabled={plan.current}
              className={cn('mt-6 w-full', plan.current ? 'btn-secondary cursor-default' : plan.featured ? 'btn-primary' : 'btn-secondary')}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      <div className="card p-5 mt-6">
        <h2 className="font-semibold mb-2">Payment Methods</h2>
        <p className="text-sm text-surface-700 mb-4">We support Stripe and Razorpay for secure payments.</p>
        <div className="flex gap-3">
          <div className="badge bg-surface-200/50 text-surface-800 px-4 py-2">Stripe</div>
          <div className="badge bg-surface-200/50 text-surface-800 px-4 py-2">Razorpay</div>
          <div className="badge bg-surface-200/50 text-surface-800 px-4 py-2">Visa</div>
          <div className="badge bg-surface-200/50 text-surface-800 px-4 py-2">Mastercard</div>
        </div>
      </div>
    </div>
  );
}
