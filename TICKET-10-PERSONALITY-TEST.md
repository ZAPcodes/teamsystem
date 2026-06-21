# Ticket 10: Picture-Based Personality Test

## Summary

Added a picture-based personality test to the employee marketplace. The feature starts as a compact square "AI taste matcher" card, expands when clicked, explains what it does, and lets the user begin a short image-choice quiz.

After completion, the user receives a saved personality result and the marketplace offer grid is filtered to the categories that match that result. The saved result persists locally, so returning users see the same result and filtered service selection later. Users can retake the test when their taste or preferences change.

The post-test result now starts blurred as a surprise. Clicking "Reveal my matches" opens a centered, scrollable result window with the personality explanation and recommended benefits. Users can add recommended benefits directly from this reveal window; those perks go into the existing package draft and the buttons update from "Add" to "In package".

## What Changed

- Added `PersonalityTestCard` in `frontend/components/perx/personality-test-card.tsx`.
- Added persisted personality state in `frontend/lib/store/personality.ts`.
- Updated `frontend/app/(employee)/marketplace/page.tsx` to render the test card, pass marketplace offers into it, and filter visible offers by the saved personality result.
- Kept category tabs working on top of the personality filter, so users can still narrow recommended perks by category.
- Reset the active tab to `All` after quiz completion so the user immediately sees the full recommended set.
- Expanded the test from 3 screens with 3 choices to 10 screens with 2 picture choices each.
- Mixed screens with captions and no captions; when captions appear, both choices on that screen have captions.
- Added visual doodles, a more playful pre-test description, a vibe-check instruction popup before the quiz, a progress bar, a blurred result state, and a scrollable reveal modal.
- Removed per-screen prompt headings so each quiz screen focuses on the two image choices.
- Wired recommended perk add buttons to the existing package draft store.

## Personality Results

The quiz can produce four profile types:

- `Adventurous Explorer`: recommends travel, wellness, and lifestyle.
- `Social Connector`: recommends food, lifestyle, and travel.
- `Quiet Recharger`: recommends learning, wellness, and food.
- `Curious Builder`: recommends learning, wellness, and lifestyle.

The result is stored in local browser storage through Zustand persist under:

```text
perx-personality-result-v1
```

## Verification

- `tsc --noEmit` passed for the frontend.
- `next build` passed after allowing network access for Google Fonts.
- Scoped ESLint on the touched marketplace/personality files has no errors and only `<img>` warnings consistent with existing offer card image usage.
- Full frontend ESLint has known wider project issues outside this feature area and may take longer to complete.
