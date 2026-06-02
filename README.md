# PEAK — 6-Week Transformation Tracker

A personal, offline web app to drive a focused 6-week body recomposition:
**77 kg → 71 kg (~10% body fat)** for a 5'11" frame, with a deliberate
emphasis on **building skinny legs** while cutting fat.

No accounts, no servers, no internet required. Everything is saved in your
browser (localStorage). Open `index.html` and go.

## What's inside

| Tab | What it does |
|-----|--------------|
| **Dashboard** | Current vs goal weight, % progress, days left, on-track pace, today's workout, and a coaching note that adapts to where you are. |
| **Weight** | Log daily weigh-ins. A chart plots your real weight against the ideal 77→71 line so you can see drift early. |
| **Training Plan** | A full 6-week plan built around *your* routine — 2× Hyrox HIIT, 2× weights (extra leg volume), 2–3× runs — with weekly progressive overload and tick-off tracking. |
| **Nutrition** | Calorie & macro targets calculated for the cut (recalculate as you lose weight), 16:8 IF guidance, a daily food checklist, and an honest cheat-day / drinking strategy. |

## The strategy in one paragraph

1 kg/week is aggressive, so the app aims for a sustainable ~0.7–0.9 kg/week of
**fat** loss with high protein (2 g/kg) to protect muscle. Legs are prioritised
in the gym (squats, RDLs, split squats, lunges, progressive overload) so they
fill out as the fat comes off. The biggest variable is the cheat day and
drinking — the Nutrition tab is blunt about keeping alcohol to one occasion a
week during these six weeks, because it's the #1 thing that stalls a cut like
this.

## Run it

Just open `index.html` in any modern browser. To serve it locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Notes & tuning

- Calorie math uses Mifflin–St Jeor with a 1.55 activity multiplier and a ~22%
  deficit. Age is set to 40 in `app.js` (`PROFILE.ageDefault`) — change it for
  a more accurate maintenance estimate.
- Start/goal weight and plan length live in the `PROFILE` object at the top of
  `app.js`.
- "Reset all data" in the footer wipes everything and starts fresh.

> Not medical advice. A 6 kg cut in 6 weeks is demanding — listen to your body,
> and check with a doctor before big diet/training changes.
