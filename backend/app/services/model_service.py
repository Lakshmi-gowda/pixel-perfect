import numpy as np


DISCLAIMER = "For decision support and educational purposes only. Not a substitute for formal diagnostic imaging."


def infer(frame, bundle):
    raw = bundle.model.predict_proba(frame)
    if raw.shape != (1, 2) or not np.isfinite(raw).all() or (raw < 0).any() or (raw > 1).any() or not np.isclose(raw[0].sum(), 1, atol=1e-6):
        raise ValueError("Model returned invalid probability output")
    # Map the direct, unrounded, uncalibrated output via classes_ and metadata.
    probabilities = {bundle.target_labels[int(c)]: float(raw[0, i]) for i, c in enumerate(bundle.model.classes_)}
    predicted_class = int(bundle.model.predict(frame)[0])
    return {"prediction": bundle.target_labels[predicted_class], "probabilities": probabilities,
            "model_version": bundle.version, "disclaimer": DISCLAIMER}