import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseclient';

type Props = {
  user: any;
};

export default function CustomerPayment({ user }: Props) {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subscriptionId, setSubscriptionId] = useState('');
  const [utr, setUtr] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadSubscriptions() {
      if (!supabase) {
        setMessage('Database connection नहीं मिला।');
        setLoading(false);
        return;
      }

      try {
        const { data: household, error: hError } = await supabase
          .from('households')
          .select('id')
          .eq('parent_user_id', user.id)
          .maybeSingle();

        if (hError) throw hError;

        if (!household) {
          setMessage('पहले Subscription Request भेजें।');
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('subscriptions')
          .select('id, plan_id, status, amount')
          .eq('household_id', household.id)
          .order('created_at', { ascending: false });
        if (error) throw error;

        const planIds = [...new Set((data || []).map((s) => s.plan_id))];

        let planMap: Record<string, any> = {};

        if (planIds.length > 0) {
          const { data: plans, error: planError } = await supabase
            .from('plans')
            .select('id, plan_name, price')
            .in('id', planIds);

          if (planError) throw planError;

          (plans || []).forEach((plan) => {
            planMap[plan.id] = plan;
          });
        }

        setSubscriptions(
          (data || []).map((s) => ({
            ...s,
            plan: planMap[s.plan_id],
          }))
        );
      } catch (error: any) {
        setMessage('जानकारी लोड नहीं हुई: ' + error.message);
      }

      setLoading(false);
    }

    loadSubscriptions();
  }, [user.id]);

  async function submitPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase) return;

    const selected = subscriptions.find((s) => s.id === subscriptionId);

    if (!selected) {
      setMessage('अपनी Subscription चुनें।');
      return;
    }

    if (!utr.trim()) {
      setMessage('UTR नंबर भरना जरूरी है।');
      return;
    }

    if (!screenshot) {
      setMessage('पेमेंट का स्क्रीनशॉट चुनना जरूरी है।');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const fileExt = screenshot.name.split('.').pop() || 'jpg';

      const filePath = user.id + '/' + Date.now() + '.' + fileExt;

      const { error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(filePath, screenshot, {
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: paymentError } = await supabase
        .from('payment_submissions')
        .insert({
          subscription_id: subscriptionId,
          amount: Number(selected.amount),
          utr_number: utr.trim(),
          screenshot_path: filePath,
          status: 'pending',
        });

      if (paymentError) throw paymentError;

      setMessage('पेमेंट की जानकारी Admin को भेज दी गई है! 🎉');
      setUtr('');

      setScreenshot(null);
      setSubscriptionId('');
    } catch (error: any) {
      setMessage('पेमेंट जमा नहीं हुआ: ' + error.message);
    }

    setSaving(false);
  }

  return (
    <div style={containerStyle}>
      <h2>💳 पेमेंट जमा करें</h2>
      <p>UPI से पेमेंट करने के बाद उसकी जानकारी यहाँ जमा करें।</p>

      {loading ? (
        <p>जानकारी लोड हो रही है...</p>
      ) : (
        <form onSubmit={submitPayment}>
          <label>अपनी Subscription चुनें *</label>
          <select
            required
            value={subscriptionId}
            onChange={(e) => setSubscriptionId(e.target.value)}
            style={inputStyle}
          >
            <option value="">Subscription चुनें</option>
            {subscriptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.plan?.plan_name || 'Lunch Plan'} - ₹{s.plan?.price || ''}
              </option>
            ))}
          </select>

          <label>UTR / Transaction नंबर *</label>
          <input
            required
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            placeholder="पेमेंट का UTR नंबर"
            style={inputStyle}
          />

          <label>पेमेंट का स्क्रीनशॉट *</label>
          <input
            required
            type="file"
            accept="image/*"
            onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
            style={inputStyle}
          />

          <button type="submit" disabled={saving} style={buttonStyle}>
            {saving ? 'जमा हो रहा है...' : 'पेमेंट की जानकारी जमा करें'}
          </button>
        </form>
      )}

      {message && <p style={{ marginTop: 15 }}>{message}</p>}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 650,
  margin: '20px auto',
  padding: 20,
  background: '#fff7ed',
  borderRadius: 14,
};

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: 12,
  margin: '7px 0 16px',
  border: '1px solid #ccc',
  borderRadius: 8,
  fontSize: 16,
};

const buttonStyle: React.CSSProperties = {
  padding: 13,
  width: '100%',
  background: '#166534',
  color: 'white',
  border: 0,
  borderRadius: 8,
  fontSize: 16,
  cursor: 'pointer',
};
