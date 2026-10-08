# GoodCryptoX — Developer Take-Home Challenge

Welcome! This is a small, self-contained exercise. It is **not** about building
something big — it is about how you read unfamiliar code, debug it, and use git.
Expect it to take **60–90 minutes**.

## The scenario

`src/priceAlert.js` powers a tiny "price alert" utility: given a list of alert
rules and the latest crypto prices, it decides which alerts should fire. A
teammate pushed it in a hurry and the test suite is **red**. Your job is to get
it green and tidy up the history.

## Tasks

1. **Make the tests pass.** Run `npm install` then `npm test`. Several tests
   fail. Fix the bugs in `src/priceAlert.js` so all tests pass. Do **not** edit
   the test files to make them pass.

2. **Add one test.** There is an un-handled edge case: an alert whose
   `direction` is neither `"above"` nor `"below"`. Add a test describing the
   behaviour you think is correct, then make the code satisfy it.

3. **Clean git history.** Work in a feature branch and make **at least three
   commits** with clear messages (e.g. one per bug fixed). We want to see your
   commit hygiene, not one giant commit.

## What to submit

Push your branch to a public git host (GitHub/GitLab) and submit the **repository
URL** back in the chat. If you can't push publicly, submit a link to a zip of the
project *including the `.git` folder* so we can read your history.

## How you'll be assessed

- Correctness: all original tests pass, no tests weakened.
- Reasoning: your added test captures a sensible edge-case decision.
- Git: branch + multiple focused commits with readable messages.
- Clarity: small, readable diffs.

Good luck — and have fun with it. If something is ambiguous, make a reasonable
call and note it in a commit message or the chat.
