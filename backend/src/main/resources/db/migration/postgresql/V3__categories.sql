CREATE TABLE public.categories (
    id UUID PRIMARY KEY,
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    category_type VARCHAR(10) NOT NULL CHECK (category_type IN ('INCOME', 'EXPENSE')),
    icon VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_default_category_name ON public.categories (category_type, lower(name)) WHERE owner_user_id IS NULL;
CREATE UNIQUE INDEX uq_owner_category_name ON public.categories (owner_user_id, category_type, lower(name)) WHERE owner_user_id IS NOT NULL;
CREATE INDEX idx_categories_owner ON public.categories(owner_user_id);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.categories FROM anon, authenticated;

INSERT INTO public.categories (id, name, category_type, icon) VALUES
('00000000-0000-4000-8000-000000000101', 'Lương', 'INCOME', 'wallet'),
('00000000-0000-4000-8000-000000000102', 'Thưởng', 'INCOME', 'gift'),
('00000000-0000-4000-8000-000000000103', 'Khác', 'INCOME', 'other'),
('00000000-0000-4000-8000-000000000201', 'Ăn uống', 'EXPENSE', 'food'),
('00000000-0000-4000-8000-000000000202', 'Di chuyển', 'EXPENSE', 'transport'),
('00000000-0000-4000-8000-000000000203', 'Nhà ở', 'EXPENSE', 'home'),
('00000000-0000-4000-8000-000000000204', 'Mua sắm', 'EXPENSE', 'shopping'),
('00000000-0000-4000-8000-000000000205', 'Sức khỏe', 'EXPENSE', 'health'),
('00000000-0000-4000-8000-000000000206', 'Giáo dục', 'EXPENSE', 'education'),
('00000000-0000-4000-8000-000000000207', 'Khác', 'EXPENSE', 'other');
