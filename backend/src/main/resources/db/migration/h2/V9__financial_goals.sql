CREATE TABLE financial_goals (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    target_amount NUMERIC(19, 2) NOT NULL CHECK (target_amount > 0),
    saved_amount NUMERIC(19, 2) NOT NULL CHECK (saved_amount >= 0),
    target_date DATE,
    note VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_financial_goals_owner_created ON financial_goals(owner_user_id, created_at DESC, id DESC);
