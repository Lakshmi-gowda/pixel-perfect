# Extracted feature contract — team confirmation required

Source: uploaded metadata and encoders, verified against the model’s exact feature order. All 52 inputs required per PRD. Numeric values are JSON numbers converted to floats; original numeric dtypes, units, clinical ranges and missing-value policy are not recorded. No clinical bounds are invented.

| # | Feature (exact spelling) | API type | Allowed labels / bounds | Required |
|---|---|---|---|---|
| 1 | Age | numeric | NEEDS_CONFIRMATION | Yes |
| 2 | Weight | numeric | NEEDS_CONFIRMATION | Yes |
| 3 | Length | numeric | NEEDS_CONFIRMATION | Yes |
| 4 | Sex | categorical | `Fmale`, `Male` | Yes |
| 5 | BMI | numeric | NEEDS_CONFIRMATION | Yes |
| 6 | DM | numeric | NEEDS_CONFIRMATION | Yes |
| 7 | HTN | numeric | NEEDS_CONFIRMATION | Yes |
| 8 | Current Smoker | numeric | NEEDS_CONFIRMATION | Yes |
| 9 | EX-Smoker | numeric | NEEDS_CONFIRMATION | Yes |
| 10 | FH | numeric | NEEDS_CONFIRMATION | Yes |
| 11 | Obesity | categorical | `N`, `Y` | Yes |
| 12 | CRF | categorical | `N`, `Y` | Yes |
| 13 | CVA | categorical | `N`, `Y` | Yes |
| 14 | Airway disease | categorical | `N`, `Y` | Yes |
| 15 | Thyroid Disease | categorical | `N`, `Y` | Yes |
| 16 | DLP | categorical | `N`, `Y` | Yes |
| 17 | BP | numeric | NEEDS_CONFIRMATION | Yes |
| 18 | PR | numeric | NEEDS_CONFIRMATION | Yes |
| 19 | Edema | numeric | NEEDS_CONFIRMATION | Yes |
| 20 | Weak Peripheral Pulse | categorical | `N`, `Y` | Yes |
| 21 | Lung rales | categorical | `N`, `Y` | Yes |
| 22 | Systolic Murmur | categorical | `N`, `Y` | Yes |
| 23 | Diastolic Murmur | categorical | `N`, `Y` | Yes |
| 24 | Typical Chest Pain | numeric | NEEDS_CONFIRMATION | Yes |
| 25 | Dyspnea | categorical | `N`, `Y` | Yes |
| 26 | Function Class | numeric | NEEDS_CONFIRMATION | Yes |
| 27 | Atypical | categorical | `N`, `Y` | Yes |
| 28 | Nonanginal | categorical | `N`, `Y` | Yes |
| 29 | Q Wave | numeric | NEEDS_CONFIRMATION | Yes |
| 30 | St Elevation | numeric | NEEDS_CONFIRMATION | Yes |
| 31 | St Depression | numeric | NEEDS_CONFIRMATION | Yes |
| 32 | Tinversion | numeric | NEEDS_CONFIRMATION | Yes |
| 33 | LVH | categorical | `N`, `Y` | Yes |
| 34 | Poor R Progression | categorical | `N`, `Y` | Yes |
| 35 | BBB | categorical | `LBBB`, `N`, `RBBB` | Yes |
| 36 | FBS | numeric | NEEDS_CONFIRMATION | Yes |
| 37 | CR | numeric | NEEDS_CONFIRMATION | Yes |
| 38 | TG | numeric | NEEDS_CONFIRMATION | Yes |
| 39 | LDL | numeric | NEEDS_CONFIRMATION | Yes |
| 40 | HDL | numeric | NEEDS_CONFIRMATION | Yes |
| 41 | BUN | numeric | NEEDS_CONFIRMATION | Yes |
| 42 | ESR | numeric | NEEDS_CONFIRMATION | Yes |
| 43 | HB | numeric | NEEDS_CONFIRMATION | Yes |
| 44 | K | numeric | NEEDS_CONFIRMATION | Yes |
| 45 | Na | numeric | NEEDS_CONFIRMATION | Yes |
| 46 | WBC | numeric | NEEDS_CONFIRMATION | Yes |
| 47 | Lymph | numeric | NEEDS_CONFIRMATION | Yes |
| 48 | Neut | numeric | NEEDS_CONFIRMATION | Yes |
| 49 | PLT | numeric | NEEDS_CONFIRMATION | Yes |
| 50 | EF-TTE | numeric | NEEDS_CONFIRMATION | Yes |
| 51 | Region RWMA | numeric | NEEDS_CONFIRMATION | Yes |
| 52 | VHD | categorical | `Moderate`, `N`, `Severe`, `mild` | Yes |

## Important findings
- Preserve `Fmale` exactly; silently changing it to `Female` would break the saved Sex encoder.
- 18 encoders; the other 34 fields are numeric under the PRD inference contract. Some names may denote encoded clinical variables, but their meanings and valid values are not inferable from the artifacts.
- Target mapping: Normal = 0, CAD = 1. Model classes: [0, 1].
- Removed training fields: Cath, LAD, LCX, RCA, Exertional CP, LowTH Ang, CHF. None appear in the 52 inputs.
- Actual uploaded encoder filename is CAD_Categorical_Encoders_1.pkl; inspection accepts this name and the PRD canonical filename.
- No vessel classifiers or SHAP/LIME artifacts were supplied. No vessel probabilities or explanations may be derived from overall CAD output.
- No real dataset row or expected Colab probabilities supplied; no golden prediction test has run.
