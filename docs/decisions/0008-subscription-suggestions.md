# 0008 — Subscription detection offers reviewable suggestions only

The API reads up to the latest 3000 owner-scoped expense transactions in the past 12 months. It groups by account, category and merchant when linked, otherwise by a whitespace-normalized, case-insensitive note. A group is suggested only when its last three payments are 25–35 days apart, each amount differs from their average by no more than 5%, and the next estimated date is not over 14 days past. The estimate is the three-payment average rounded to VND cents; the next date is one calendar month after the latest payment.

This is a heuristic, not proof of a subscription. Missing notes and merchants cannot form a group. Income and transfers are excluded. The result is read-only and does not create a recurring rule, new transaction, reminder or charge. The user can review a suggestion and independently use the existing recurring-rule form.
