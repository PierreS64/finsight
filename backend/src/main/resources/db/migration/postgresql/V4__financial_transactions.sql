CREATE TABLE public.financial_transactions (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    kind VARCHAR(7) NOT NULL CHECK (kind IN ('INCOME', 'EXPENSE')),
    amount NUMERIC(19, 2) NOT NULL CHECK (amount > 0),
    occurred_on DATE NOT NULL,
    note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaction_owner_account FOREIGN KEY (owner_user_id, account_id)
        REFERENCES public.financial_accounts(owner_user_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_transactions_owner_date ON public.financial_transactions(owner_user_id, occurred_on DESC, created_at DESC, id DESC);
CREATE INDEX idx_transactions_owner_account ON public.financial_transactions(owner_user_id, account_id);
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.financial_transactions FROM anon, authenticated;
