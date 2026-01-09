import { createClient } from '@supabase/supabase-js';
import './style.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  experience: string;
  interests: string[];
  message?: string;
}

interface ExchangeRate {
  id: string;
  pair: string;
  price: number;
  price_change_24h: number;
  volume_24h: number;
  high_24h: number;
  low_24h: number;
  market_cap: number;
  last_updated: string;
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else {
    return `$${price.toFixed(4)}`;
  }
}

async function fetchLiveRates(): Promise<void> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/get-live-rates`, {
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success && result.rates) {
      updateHeroCard(result.rates);
    }
  } catch (error) {
    console.error('Error fetching live rates:', error);
  }
}

function updateHeroCard(rates: ExchangeRate[]): void {
  const btcRate = rates.find((rate: ExchangeRate) => rate.pair === 'BTC-USD');
  if (!btcRate) return;

  const btcPrice = document.getElementById('btcPrice');
  const btcChange = document.getElementById('btcChange');
  const btcCard = document.getElementById('btcCard');

  if (btcPrice) {
    btcPrice.textContent = formatPrice(btcRate.price);
  }

  if (btcChange) {
    const changePercent = btcRate.price_change_24h.toFixed(2);
    const isPositive = btcRate.price_change_24h >= 0;
    btcChange.textContent = `${isPositive ? '+' : ''}${changePercent}%`;
    btcChange.className = `chart-change ${isPositive ? 'positive' : 'negative'}`;
  }

  if (btcCard && btcPrice) {
    const isPositive = btcRate.price_change_24h >= 0;
    btcPrice.className = `chart-price ${isPositive ? 'positive' : 'negative'}`;
  }
}

function getDaysUntilCourseStart(): number {
  const baseDate = new Date('2026-01-09T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - baseDate.getTime();
  const daysSinceBase = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const daysInCycle = daysSinceBase % 7;
  const daysLeft = 7 - daysInCycle;

  return daysLeft === 0 ? 7 : daysLeft;
}

function updateCourseBadge(): void {
  const badge = document.getElementById('courseBadge');
  if (!badge) return;

  const daysLeft = getDaysUntilCourseStart();

  if (daysLeft === 1) {
    badge.textContent = `🔥 Старт потока через ${daysLeft} день`;
  } else if (daysLeft >= 2 && daysLeft <= 4) {
    badge.textContent = `🔥 Старт потока через ${daysLeft} дня`;
  } else {
    badge.textContent = `🔥 Старт потока через ${daysLeft} дней`;
  }
}

let refreshInterval: number;

function startAutoRefresh(): void {
  fetchLiveRates();
  updateCourseBadge();

  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  refreshInterval = setInterval(() => {
    fetchLiveRates();
  }, 30000);
}

function initializeApp() {
  startAutoRefresh();

  const form = document.getElementById('leadForm') as HTMLFormElement;
  const submitBtn = form?.querySelector('.submit-btn') as HTMLButtonElement;
  const successModal = document.getElementById('successModal') as HTMLDivElement;
  const navbar = document.querySelector('.navbar') as HTMLElement;

  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 100) {
        navbar.style.background = 'rgba(15, 23, 42, 0.95)';
      } else {
        navbar.style.background = 'rgba(15, 23, 42, 0.8)';
      }
    });
  }

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      }
    });
  }, observerOptions);

  const animateElements = document.querySelectorAll('.feature-card, .program-card, .testimonial-card');
  animateElements.forEach(el => observer.observe(el));

  if (form && submitBtn && successModal) {
    form.addEventListener('submit', async (e: Event) => {
      e.preventDefault();

      const formData = new FormData(form);

      const interests: string[] = [];
      const interestCheckboxes = form.querySelectorAll('input[name="interests"]:checked') as NodeListOf<HTMLInputElement>;
      interestCheckboxes.forEach(checkbox => {
        interests.push(checkbox.value);
      });

      if (interests.length === 0) {
        alert('Пожалуйста, выберите хотя бы один вариант обучения');
        return;
      }

      const leadData: LeadFormData = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        experience: formData.get('experience') as string,
        interests: interests,
        message: formData.get('message') as string || undefined,
      };

      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      try {
        const googleSheetsUrl = 'https://script.google.com/macros/s/AKfycbyx7UdTbuwfOn7lG8MQFLeFgsELwfVN8oSE21_0yom9dsQs-MrNhka9hTEvcRWcX48SGg/exec';

        await fetch(googleSheetsUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone,
            experience: leadData.experience,
            interests: leadData.interests.join(', '),
            message: leadData.message || ''
          })
        });

        console.log('Lead submitted to Google Sheets successfully');

        form.reset();
        successModal.classList.add('show');

        setTimeout(() => {
          successModal.classList.remove('show');
        }, 5000);

      } catch (err) {
        console.error('Unexpected error:', err);
        alert('Произошла непредвиденная ошибка. Пожалуйста, попробуйте позже.');
      } finally {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
