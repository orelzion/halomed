# Feature: Tinder-Style Review Sessions

## Status: Planned

## Problem
- Reviews appear as 27+ individual nodes in the learning path
- Overwhelming and clutters the path UI
- Full content shown again (same as learning) - too heavy for quick recall

## Proposed Solution
A swipeable card interface for review sessions:

### UX Flow
1. User taps "Review Session" node in path
2. Opens dedicated review screen with swipeable cards
3. Each card shows condensed content:
   - **Title**: e.g., "ברכות פרק א׳ משנה א׳"
   - **Mishnah text**: The source
   - **Brief explanation**: Condensed, not full learning content
4. Swipe card to mark as reviewed, next card appears
5. "Dive Deeper" button → navigates to full study page
6. Progress bar shows "12/27 reviewed"

### Wireframe
```
┌─────────────────────────┐
│  Review Session (12/27) │  ← progress bar
├─────────────────────────┤
│                         │
│     ברכות פרק א׳ משנה א׳  │  ← title
│                         │
│   [Mishnah text here]   │  ← the source
│                         │
│   [Brief explanation]   │  ← condensed
│                         │
│     [ Dive Deeper ]     │  ← button → full study page
│                         │
│    ← swipe to continue  │
└─────────────────────────┘
```

### Optional Enhancement
Swipe direction could affect scheduling:
- **Swipe right** = "Got it" ✓ (normal interval)
- **Swipe left** = "Need more practice" (schedule sooner)

### Technical Approach
- Use Framer Motion or react-tinder-card for swipe animations
- New route: `/review-session` or modal overlay
- Fetch all review nodes for today, display as cards
- "Dive Deeper" links to `/study/[content_ref]`
- Track completion in learning_path (mark nodes as completed)

### Benefits
- Less overwhelming (1 session vs 27 items)
- Mobile-native swipe gestures
- Faster review - focused on recall
- Gamified feel - satisfying progress
- Clear escape hatch for confused items

---

*Created: 2026-01-25*
