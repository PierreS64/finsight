CREATE TABLE public.financial_goals (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target_amount NUMERIC(19, 2) NOT NULL CHECK (target_amount > 0),
    saved_amount NUMERIC(19, 2) NOT NULL CHECK (saved_amount >= 0),
    target_date DATE,
    note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_financial_goals_owner_created ON public.financial_goals(owner_user_id, created_at DESC, id DESC);
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.financial_goals FROM anon, authenticated;
