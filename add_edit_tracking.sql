-- Add edit tracking columns to sales_transactions
ALTER TABLE sales_transactions
ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN edited_by TEXT,
ADD COLUMN original_value NUMERIC;

-- Add edit tracking columns to expenses
ALTER TABLE expenses
ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN edited_by TEXT,
ADD COLUMN original_value NUMERIC;

-- In case we ever need to query these often for reports, we can create indices:
CREATE INDEX idx_sales_is_edited ON sales_transactions(is_edited);
CREATE INDEX idx_expenses_is_edited ON expenses(is_edited);
