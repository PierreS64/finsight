CREATE TABLE public.merchants (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    normalized_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_merchant_owner_name UNIQUE (owner_user_id, normalized_name),
    CONSTRAINT uq_merchant_owner_id UNIQUE (owner_user_id, id)
);
CREATE INDEX idx_merchants_owner_name ON public.merchants(owner_user_id, name);

ALTER TABLE public.financial_transactions ADD COLUMN merchant_id UUID;
ALTER TABLE public.financial_transactions ADD CONSTRAINT fk_transaction_owner_merchant
    FOREIGN KEY (owner_user_id, merchant_id) REFERENCES public.merchants(owner_user_id, id) ON DELETE RESTRICT;
CREATE INDEX idx_transactions_owner_merchant ON public.financial_transactions(owner_user_id, merchant_id);
