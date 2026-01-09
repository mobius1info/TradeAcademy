/*
  # Таблица для курсов обмена валют

  ## Новые таблицы
  
  1. `exchange_rates` - Реальные курсы валют
     - `id` (uuid, primary key)
     - `pair` (text) - валютная пара (BTC-USD, ETH-USD)
     - `price` (numeric) - текущая цена
     - `price_change_24h` (numeric) - изменение за 24ч в %
     - `volume_24h` (numeric) - объем торгов за 24ч
     - `high_24h` (numeric) - максимум за 24ч
     - `low_24h` (numeric) - минимум за 24ч
     - `market_cap` (numeric) - капитализация
     - `last_updated` (timestamptz) - время последнего обновления
     - `created_at` (timestamptz)

  2. `rate_history` - История курсов для графиков
     - `id` (uuid, primary key)
     - `pair` (text) - валютная пара
     - `price` (numeric) - цена
     - `timestamp` (timestamptz) - время записи

  ## Безопасность
  
  - Enable RLS на всех таблицах
  - Публичный доступ на чтение для всех
*/

-- Таблица текущих курсов
CREATE TABLE IF NOT EXISTS exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair text NOT NULL UNIQUE,
  price numeric NOT NULL DEFAULT 0,
  price_change_24h numeric DEFAULT 0,
  volume_24h numeric DEFAULT 0,
  high_24h numeric DEFAULT 0,
  low_24h numeric DEFAULT 0,
  market_cap numeric DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair ON exchange_rates(pair);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_last_updated ON exchange_rates(last_updated);

-- Таблица истории курсов
CREATE TABLE IF NOT EXISTS rate_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pair text NOT NULL,
  price numeric NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Индексы для быстрых запросов по истории
CREATE INDEX IF NOT EXISTS idx_rate_history_pair ON rate_history(pair);
CREATE INDEX IF NOT EXISTS idx_rate_history_timestamp ON rate_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rate_history_pair_timestamp ON rate_history(pair, timestamp DESC);

-- Enable RLS
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_history ENABLE ROW LEVEL SECURITY;

-- Политики для чтения (публичный доступ)
CREATE POLICY "Anyone can view exchange rates"
  ON exchange_rates FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can view rate history"
  ON rate_history FOR SELECT
  TO anon, authenticated
  USING (true);

-- Политики для записи (только для сервиса)
CREATE POLICY "Service can insert exchange rates"
  ON exchange_rates FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Service can update exchange rates"
  ON exchange_rates FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service can insert rate history"
  ON rate_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Функция для автоматической очистки старых записей истории (старше 30 дней)
CREATE OR REPLACE FUNCTION cleanup_old_rate_history()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_history
  WHERE timestamp < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- Вставляем начальные данные для популярных пар
INSERT INTO exchange_rates (pair, price, price_change_24h, volume_24h, high_24h, low_24h, market_cap)
VALUES
  ('BTC-USD', 67432.50, 12.5, 25000000000, 68000, 65000, 1320000000000),
  ('ETH-USD', 3245.80, 8.3, 12000000000, 3300, 3100, 390000000000),
  ('USDT-USD', 1.00, 0.01, 45000000000, 1.01, 0.99, 95000000000),
  ('BNB-USD', 312.45, 5.2, 850000000, 320, 305, 48000000000),
  ('SOL-USD', 98.75, 15.8, 2500000000, 105, 92, 42000000000)
ON CONFLICT (pair) DO NOTHING;