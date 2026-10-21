CREATE TABLE account_reconciliations (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL,
    account_id UUID NOT NULL,
    expected_balance NUMERIC(30, 2) NOT NULL,
    observed_balance NUMERIC(30, 2) NOT NULL,
    difference_amount NUMERIC(30, 2) NOT NULL,
    note VARCHAR(500),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reconciliation_owner_account FOREIGN KEY (owner_user_id, account_id)
        REFERENCES financial_accounts(owner_user_id, id) ON DELETE CASCADE
);
CREATE INDEX idx_reconciliations_owner_account_date ON account_reconciliations(owner_user_id, account_id, recorded_at DESC, id DESC);
