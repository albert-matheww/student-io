"""The lesson-level revision ladder: 1 day, 3 days, 7 days, 14 days, 30 days.
Every completed lesson enters at stage 0; a successful review advances one
stage, a failed one resets to stage 0 with a 1-day retry."""

REVISION_INTERVALS_DAYS = [1, 3, 7, 14, 30]
