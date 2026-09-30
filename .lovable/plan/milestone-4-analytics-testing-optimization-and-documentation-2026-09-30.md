# Milestone 4 — Analytics, testing, optimization, and documentation

## What will be built
- Add a clickable **Analytics** area inside the existing Atlas workspace.
- Derive real usage metrics from saved conversations: query types, confidence, answered/clarified/unanswered outcomes, retrieval quality, domains, and recurring knowledge gaps.
- Add filters for date range, knowledge domain, query type, confidence, and resolution status.
- Add drill-down lists for unanswered and low-confidence questions so every summary can be inspected.
- Add a clickable **Project report** page covering architecture, agent responsibilities, ingestion and query flows, data model, implementation, testing, limitations, and future improvements.
- Add a **Testing & optimization** view for the required three-domain test matrix, before/after measurements, and final demonstration checklist.
- Add links to all new areas in desktop and mobile workspace navigation.

## Technical details
- Reuse existing message metadata as the analytics event source, preserving the separate knowledge base and conversation data model.
- Add authenticated server-side aggregation so each user only sees their own activity.
- Keep all new pages under the existing authenticated workspace and give each route unique metadata.
- Avoid invented benchmark results: testing views will clearly distinguish measured activity from pending test evidence.
- Verify navigation, filters, mobile layout, build health, and representative analytics states.
