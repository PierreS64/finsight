CREATE TABLE balance_sheet_items (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    kind VARCHAR(12) NOT NULL CHECK (kind IN ('ASSET', 'LIABILITY')),
    amount NUMERIC(19, 2) NOT NULL CHECK (amount >= 0),
    note VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_balance_sheet_items_owner ON balance_sheet_items(owner_user_id, created_at DESC, id DESC);
