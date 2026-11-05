CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL,
    account_id UUID NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    kind VARCHAR(7) NOT NULL CHECK (kind IN ('INCOME', 'EXPENSE')),
    amount NUMERIC(19, 2) NOT NULL CHECK (amount > 0),
    occurred_on DATE NOT NULL,
    note VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transaction_owner_account FOREIGN KEY (owner_user_id, account_id)
        REFERENCES financial_accounts(owner_user_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_transactions_owner_date ON financial_transactions(owner_user_id, occurred_on DESC, created_at DESC, id DESC);
CREATE INDEX idx_transactions_owner_account ON financial_transactions(owner_user_id, account_id);
