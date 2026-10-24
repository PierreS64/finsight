# 0004 — Merchant identity is user maintained

Each user maintains a private list of merchant names and may select one for a transaction. An optional merchant link does not change amount, category, account balance, income or expense. Case-insensitive duplicate names are rejected per owner. The database enforces a composite owner/merchant foreign key and blocks deletion while a transaction refers to the merchant.

Receipt OCR may suggest a merchant name. If it exactly matches one of the user's saved names without regard to case, the form suggests that existing merchant; OCR never creates a merchant or a transaction. A user reviews and saves the form explicitly.
