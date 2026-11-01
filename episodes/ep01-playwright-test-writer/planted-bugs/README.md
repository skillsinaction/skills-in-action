# Planted bugs

Seven small changes to `tinyshop/site/app.js`, each one breaking one rule from `SPEC.md`. They are the same bugs `tools/bugcheck.mjs` and `experiment/score.py` plant automatically. Use them to break the app by hand and watch your tests go red:

```bash
cd tinyshop
patch -p1 < ../planted-bugs/M1-save20-gives-2-percent.patch
npx playwright test            # should fail
patch -R -p1 < ../planted-bugs/M1-save20-gives-2-percent.patch
```

M2 can't be caught on this page (no cart totals exactly €30.00), so results are scored out of 6. See [RESULTS.md](../RESULTS.md).
