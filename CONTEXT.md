# Meal Planner

Household meal planning for two people: recipes, weekly meal plans built from those recipes, and
shopping lists generated from a plan. This is a glossary of the domain's vocabulary — for the data
model's fields and the API, see [docs/spec.md](docs/spec.md); for why non-obvious decisions were made,
see [docs/adr/](docs/adr/).

## Language

**Recipe**:
A dish as written — its ingredients and their quantities, at the amount someone would actually cook it
in. A Recipe is never scaled by itself; scaling only happens when it's placed into a Meal Plan Entry.
_Avoid_: Meal (see Meal Plan Entry)

**Portion**:
How much of a Recipe is actually used for one Meal Plan Entry, expressed as a multiplier on the Recipe's
ingredient quantities. Defaults to 1× — the Recipe exactly as written — and is never derived
automatically from a Profile's Target. See [ADR-0001](docs/adr/0001-portions-default-unscaled.md).
_Avoid_: Scaling factor (that's the field name on the entry; "portion" is what a person means when using
the app), Serving size

**Meal Plan Entry**:
One Recipe, at a chosen Portion, assigned to one meal slot — a Meal Type, on a Day, for one Profile —
within a Meal Plan. This is the thing that actually gets eaten and shopped for; a Recipe by itself is
just a definition nobody has committed to yet.
_Avoid_: Meal, Entry

**Profile**:
One household member's physical stats, activity level, and Goal — the inputs to their daily Target. Two
Profiles exist per household by design; this is not a generic multi-user account system, and there is no
login associated with a Profile.
_Avoid_: User, Account

**Goal**:
CUT, MAINTAIN, or BULK — the direction a Profile's Target is adjusted from their maintenance calorie
level. Changing a Profile's Goal changes their Target; it does not touch any Meal Plan Entry already
planned for them.
_Avoid_: Diet, Phase

**Target**:
A Profile's daily calorie and macro numbers after their Goal is applied. What a day's Meal Plan Entries
are compared against on the planner — never something a Meal Plan Entry is forced to match.
_Avoid_: Maintenance TDEE (a different, unadjusted number that exists alongside Target — see
docs/spec.md's TDEE section for both)
