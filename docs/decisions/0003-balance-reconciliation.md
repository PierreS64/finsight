# 0003 — Balance reconciliation is an audit snapshot

When a user counts or reads a balance outside FinSight, they can record that observed amount against one of their virtual accounts. FinSight saves its computed account balance at that moment and the exact difference: observed minus expected. A balanced result is zero; a positive difference is surplus, and a negative difference is shortfall.

The record is an audit snapshot. It does not create a transaction or adjust the account. The user can inspect the discrepancy and decide whether to correct an existing transaction or enter a new one. This preserves the existing account and cash-flow rules. Each snapshot stores its owner and account, and the API checks ownership for create, list and delete.
