# Support tickets table missing (MySQL 500)

If the app shows:

`Table 'xvrythng.support_tickets' doesn't exist`

run these migrations **in order** on your `xvrythng` database (same DB the API uses):

```bash
mysql -u YOUR_USER -p xvrythng < database/migrations/004_support_tickets.sql
mysql -u YOUR_USER -p xvrythng < database/migrations/006_support_tickets_category.sql
mysql -u YOUR_USER -p xvrythng < database/migrations/008_support_tickets_withdrawn.sql
```

- `004` creates `support_tickets` and `support_ticket_replies`.
- `006` adds `category` / `category_other`.
- `008` extends the `status` enum with `withdrawn`.

If `005_leads_company_liaison.sql` was never applied and your `leads` table lacks columns referenced by FKs, apply that migration first (see comments in `004_support_tickets.sql`).
