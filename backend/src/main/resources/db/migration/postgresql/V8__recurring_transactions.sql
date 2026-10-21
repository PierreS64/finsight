CREATE TABLE public.recurring_rules (
    id UUID PRIMARY KEY,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    kind VARCHAR(7) NOT NULL CHECK (kind IN ('INCOME', 'EXPENSE')),
    amount NUMERIC(19, 2) NOT NULL CHECK (amount > 0),
    cadence VARCHAR(7) NOT NULL CHECK (cadence IN ('WEEKLY', 'MONTHLY')),
    next_due_on DATE NOT NULL,
    anchor_day SMALLINT NOT NULL CHECK (anchor_day BETWEEN 1 AND 31),
    anchor_end_of_month BOOLEAN NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    note VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recurring_owner_account FOREIGN KEY (owner_user_id, account_id)
        REFERENCES public.financial_accounts(owner_user_id, id) ON DELETE RESTRICT
);

CREATE INDEX idx_recurring_owner_due ON public.recurring_rules(owner_user_id, active, next_due_on);
CREATE TABLE public.recurring_occurrences (
    rule_id UUID NOT NULL REFERENCES public.recurring_rules(id) ON DELETE CASCADE,
    due_on DATE NOT NULL,
    transaction_id UUID UNIQUE REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
    PRIMARY KEY (rule_id, due_on)
);
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_occurrences ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.recurring_rules, public.recurring_occurrences FROM anon, authenticated;
