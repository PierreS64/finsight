CREATE TABLE public.transaction_receipts (
    transaction_id UUID PRIMARY KEY REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
    image_data BYTEA NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.transaction_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.transaction_receipts FROM anon, authenticated;
