CREATE TABLE public.financial_accounts (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('CASH', 'BANK', 'E_WALLET', 'OTHER')),
    opening_balance NUMERIC(19, 2) NOT NULL DEFAULT 0,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'VND' CHECK (currency_code = 'VND'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_financial_account_owner_id UNIQUE (owner_user_id, id)
);

CREATE INDEX idx_financial_accounts_owner ON public.financial_accounts(owner_user_id);
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.financial_accounts FROM anon, authenticated;
