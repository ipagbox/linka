# Stage Task Template

Use this template when defining a task for the agent.

---

## Stage

Stage N — <name>

---

## Objective

What must become true after this stage is complete.

---

## Why this stage exists

What risk or dependency this stage resolves.

---

## In scope

- item
- item
- item

---

## Out of scope

- item
- item
- item

---

## Constraints

- follow architecture constraints (Matrix, Synapse, Ruby on Rails control-plane, PWA)
- no custom crypto
- no fake production-ready claims
- no reliance on push success
- no runtime dependency downloads if avoidable
- prefer simple and explicit solutions

---

## Required artifacts

- code changes
- documentation updates
- test updates
- scripts (if needed)
- CI updates (if needed)

---

## Definition of done

- measurable condition
- measurable condition
- measurable condition

Examples:
- route returns expected response
- UI renders expected state
- tests pass in CI
- no secrets required

---

## Validation steps

- command to run
- command to run
- expected result

---

## Regression guard

- all previous stage tests must pass
- no breaking changes to earlier functionality

---

## Notes for agent

- do not overengineer
- avoid abstractions unless necessary
- keep code readable and explicit
- do not introduce unrelated changes
