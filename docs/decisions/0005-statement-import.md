# 0005 — Statement import requires review

FinSight reads local CSV UTF-8 or XLSX files with a header and four columns: `date`, `description`, `amount`, `type`. Vietnamese header aliases are accepted. Date is ISO or day/month/year; amount is a positive VND decimal with at most two fractional digits. The file limit is 2 MB and 200 rows. No bank login or bank API is used.

The user chooses an owned account, reviews parsed rows, selects the right category for each row, and confirms any row resembling an existing transaction. Preview does not write data. Import creates all selected transactions in one database transaction. Each imported row is linked to the source file's SHA-256 digest and source row number, unique per owner, so importing the same row from the same bytes again is rejected. A modified file may evade this exact-file check; date, kind, amount and description matching raises a separate review warning. The user can deselect a row or deliberately confirm a possible duplicate.

Import metadata is private, owner scoped and deleted with its transaction. Amounts use `BigDecimal`/`NUMERIC(19,2)`. The import changes balances and reports only through the same saved transactions as manual entry.
