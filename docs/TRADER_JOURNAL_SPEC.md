# Trader Journal — V4

The Trader Journal is independent from the Trading Log. A user can document any market day even when no position is opened.

## Core sections

1. Market Permission: Down, Transition, or Up.
2. Does the market deserve capital today?
3. Free-form daily notes.
4. Daily process checklist.
5. Execution score and emotions.
6. Screenshots and attachments.
7. Errors, learnings, and phrase of the day.
8. Optional links to one or more positions.

## Product rule

JournalEntry is a first-class aggregate and must not be stored as a note inside Position. This preserves no-trade days, market-cycle observations, and behavioral records.
