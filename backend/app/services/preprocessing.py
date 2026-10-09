import math
import pandas as pd

from app.core.errors import ServiceError


def preprocess(features, bundle):
    errors = {}
    expected = set(bundle.feature_order)
    for name in bundle.feature_order:
        if name not in features:
            errors[name] = ["This feature is required."]
    for name in features.keys() - expected:
        errors[name] = ["Unknown or excluded feature."]
    row = {}
    for name in bundle.feature_order:
        if name not in features:
            continue
        value = features[name]
        if name in bundle.encoders:
            encoder = bundle.encoders[name]
            allowed = encoder.classes_.tolist()
            if type(value) not in (str, int, float) or not any(type(value) is type(c) and value == c for c in allowed):
                errors[name] = [f"Choose an allowed label: {', '.join(map(str, allowed))}."]
            else:
                row[name] = float(encoder.transform([value])[0])
        else:
            if type(value) not in (int, float):
                errors[name] = ["Send a finite JSON number, not text, null, or a boolean."]
                continue
            try:
                number = float(value)
                if not math.isfinite(number):
                    raise ValueError()
                row[name] = number
            except (ValueError, OverflowError):
                errors[name] = ["Send a finite JSON number."]
    if errors:
        raise ServiceError(422, "VALIDATION_ERROR", "Correct the highlighted inputs.", errors)
    # No imputation, scaling, fitting, category normalization, or clinical bounds
    # are documented in the supplied artifacts/PRD. Never invent them.
    return pd.DataFrame([row], columns=bundle.feature_order)[bundle.feature_order]