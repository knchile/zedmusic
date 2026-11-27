# Product & architecture decisions

Confirmed by the CEO on 2026-11-27.

| # | Decision | Rationale | Where enforced |
|---|---|---|---|
| D1 | **Only signed-in listeners' qualified streams count towards charts.** Anonymous plays still count in artist statistics. | Signed-in listening is much harder to fake; chart credibility matters more than early volume. | `stream_rule_sets.charts_require_authenticated_listener = true` (rules v1); `/charts/methodology` §3 |
| D2 | **Host on Vercel Pro** (not Hobby). | Hobby forbids commercial use and limits cron to daily runs; aggregation and chart jobs need more frequent schedules. | `docs/DEPLOYMENT.md` §4 |
| D3 | **Weekly chart period: Friday 00:00 – Thursday 23:59, Africa/Lusaka.** | Aligns with international chart-tracking weeks; Zambia has no DST so periods are stable. | `chart_definitions.methodology`; `/charts/methodology` §4 |

Changing any of these requires a new methodology version and a public announcement before it takes effect.
