CREATE TABLE recurring_rules (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL,
    account_id UUID NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    kind VARCHAR(7) NOT NULL CHECK (kind IN ('INCOME', 'EXPENSE')),
    amount NUMERIC(19, 2) NOT NULL CHECK (amount > 0),
    cadence VARCHAR(7) NOT NULL CHECK (cadence IN ('WEEKLY', 'MONTHLY')),
    next_due_on DATE NOT NULL,
    anchor_day SMALLINT NOT NULL CHECK (anchor_day BETWEEN 1 AND 31),
    anchor_end_of_month BOOLEAN NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    note VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recurring_owner_account FOREIGN KEY (owner_user_id, account_id)
        REFERENCES financial_accounts(owner_user_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_recurring_owner_due ON recurring_rules(owner_user_id, active, next_due_on);
CREATE TABLE recurring_occurrences (
    rule_id UUID NOT NULL REFERENCES recurring_rules(id) ON DELETE CASCADE,
    due_on DATE NOT NULL,
    transaction_id UUID UNIQUE REFERENCES financial_transactions(id) ON DELETE SET NULL,
    PRIMARY KEY (rule_id, due_on)
);
