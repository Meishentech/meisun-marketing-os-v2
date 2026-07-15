-- Phase 1 Batch 6A follow-up: soft cancel sales requests.
-- Adds audit fields so user-cancelled requests remain available for history and reporting.

alter table sales_requests
  add column if not exists cancelled_at timestamptz;

alter table sales_requests
  add column if not exists cancelled_by citext references app_user_access(email);

create index if not exists idx_sales_requests_cancelled
  on sales_requests(cancelled_at);
