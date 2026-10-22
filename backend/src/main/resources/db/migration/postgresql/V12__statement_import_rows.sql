ALTER TABLE public.financial_transactions ADD CONSTRAINT uq_transaction_owner_id UNIQUE (owner_user_id, id);

CREATE TABLE public.statement_import_rows (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL UNIQUE,
    source_hash CHAR(64) NOT NULL,
    row_number INTEGER NOT NULL CHECK (row_number > 1),
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_statement_import_source_row UNIQUE (owner_user_id, source_hash, row_number),
    CONSTRAINT fk_statement_import_owner_transaction FOREIGN KEY (owner_user_id, transaction_id)
        REFERENCES public.financial_transactions(owner_user_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_statement_import_owner_hash ON public.statement_import_rows(owner_user_id, source_hash);
ALTER TABLE public.statement_import_rows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.statement_import_rows FROM anon, authenticated;
