CREATE TABLE public.balance_sheet_items (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    kind VARCHAR(12) NOT NULL CHECK (kind IN ('ASSET', 'LIABILITY')),
    amount NUMERIC(19, 2) NOT NULL CHECK (amount >= 0),
    note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_balance_sheet_items_owner ON public.balance_sheet_items(owner_user_id, created_at DESC, id DESC);
ALTER TABLE public.balance_sheet_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.balance_sheet_items FROM anon, authenticated;
