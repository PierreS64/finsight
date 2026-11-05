CREATE TABLE public.account_reconciliations (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL,
    expected_balance NUMERIC(30, 2) NOT NULL,
    observed_balance NUMERIC(30, 2) NOT NULL,
    difference_amount NUMERIC(30, 2) NOT NULL,
    note VARCHAR(500),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_reconciliation_owner_account FOREIGN KEY (owner_user_id, account_id)
        REFERENCES public.financial_accounts(owner_user_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_reconciliations_owner_account_date ON public.account_reconciliations(owner_user_id, account_id, recorded_at DESC, id DESC);
ALTER TABLE public.account_reconciliations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.account_reconciliations FROM anon, authenticated;
