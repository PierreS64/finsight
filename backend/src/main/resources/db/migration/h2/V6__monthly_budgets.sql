CREATE TABLE monthly_budgets (
    owner_user_id UUID NOT NULL,
    budget_month DATE NOT NULL,
    limit_amount NUMERIC(19, 2) NOT NULL CHECK (limit_amount > 0),
    PRIMARY KEY (owner_user_id, budget_month)
);

CREATE TABLE category_budgets (
    owner_user_id UUID NOT NULL,
    budget_month DATE NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    limit_amount NUMERIC(19, 2) NOT NULL CHECK (limit_amount > 0),
    PRIMARY KEY (owner_user_id, budget_month, category_id)
);
