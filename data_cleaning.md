### I used DuckDB's native parquet glob querying so the raw files stay partitioned by month and DuckDB handles the predicate pushdown: it only reads the columns and row groups needed per query rather than loading everything into memory. For the baseline queries that run on every batch I materialized a processed table with a composite index on day-of-week and hour-of-day, which brought baseline query time down to under 5ms.

## Data Cleaning Steps:

- remove negative fare_amounts (not possible, most obviously data error)
- remove too high fare (mayeb >500). there can still be some high amounts, rare, but possible, so we need to keep them
- remove 0 trip distance
- passenger count can only be between 1 and 5. 0 and >6 are not legitimate as per nyc taxi rules
- check fare per mile: per mile is  a more principled filter than checking fare and distance separately because it captures the relationship between them. A $500 fare on a 20-mile trip is plausible. A $500 fare on a 0.5-mile trip is clearly broken. Separate filters can't catch that. The ratio can.
- validate per mile threshold empirically using the 6 month data

* Fare-per-mile upper bound derived using two independent methods: (1) theoretical maximum computed from NYC TLC 2023 rate sheet : base fare $3.00 + $3.50/mile + all applicable surcharges on a 0.5-mile trip yields a ceiling of $28.1/mile, the highest physically possible legitimate fare rate; (2) empirical Tukey outer fence (Q3 + 3×IQR) on 6 months of data yielded $19.0/mile. Final threshold set at the minimum of both. Any record exceeding this cannot be explained by either the fare structure or the empirical distribution of real trips.

* Initially fare_per_mile upper bound of $7.2/mile (derived from fare_per_mile maximum value) was found to remove 48.3% of valid records, primarily short trips (< 2 miles) where fixed surcharges (congestion $2.75, MTA $0.50, base $3.00) legitimately produce high per-mile ratios independent of distance. Upper bound revised to $19/mile based on empirical pass rate analysis: the 3.0–19.0 range retains 99.8% of filtered records while removing only those with internally inconsistent fare/distance combinations. The per-mile lower bound of $3.00/mile remains justified by the TLC standard rate of $3.00 initial charge, below which the meter was likely not running.