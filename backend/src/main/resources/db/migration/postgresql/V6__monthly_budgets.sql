CREATE TABLE public.monthly_budgets (
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_month DATE NOT NULL,
    limit_amount NUMERIC(19, 2) NOT NULL CHECK (limit_amount > 0),
    PRIMARY KEY (owner_user_id, budget_month)
);

CREATE TABLE public.category_budgets (
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_month DATE NOT NULL,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    limit_amount NUMERIC(19, 2) NOT NULL CHECK (limit_amount > 0),
    PRIMARY KEY (owner_user_id, budget_month, category_id)
);

ALTER TABLE public.monthly_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.monthly_budgets, public.category_budgets FROM anon, authenticated;
