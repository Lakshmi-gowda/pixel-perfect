"""Inspect team artifacts with an explicit deserialization class allowlist.

Run in an isolated Python environment. Never use unrestricted pickle.load.
This is a compatibility check, not a verified clinical prediction test.
"""
import argparse
import hashlib
import importlib.metadata
import json
from pathlib import Path
import pickletools

from joblib.numpy_pickle import NumpyUnpickler


ALLOWED_GLOBALS = {
    ("xgboost.sklearn", "XGBClassifier"),
    ("xgboost.core", "Booster"),
    ("sklearn.preprocessing._label", "LabelEncoder"),
    ("joblib.numpy_pickle", "NumpyArrayWrapper"),
    ("numpy", "ndarray"),
    ("numpy", "dtype"),
    ("numpy._core.multiarray", "_reconstruct"),
    ("numpy.core.multiarray", "_reconstruct"),
    ("numpy._core.multiarray", "scalar"),
    ("numpy.core.multiarray", "scalar"),
    ("builtins", "bytearray"),
}


class RestrictedUnpickler(NumpyUnpickler):
    def find_class(self, module, name):
        if (module, name) not in ALLOWED_GLOBALS:
            raise ValueError(f"Unsupported serialized class: {module}.{name}")
        return super().find_class(module, name)


def load_artifact(path):
    with path.open("rb") as stream:
        return RestrictedUnpickler(str(path), stream, ensure_native_byte_order=True).load()


def serialized_strings(path):
    # Plain metadata pickle is safe to tokenize without invoking its contents.
    return [arg for op, arg, _ in pickletools.genops(path.read_bytes()) if isinstance(arg, str)]


def inspect_artifacts(directory):
    metadata_path = directory / "CAD_XGBoost_Metadata.pkl"
    encoder_path = directory / "CAD_Categorical_Encoders.pkl"
    if not encoder_path.exists():
        encoder_path = directory / "CAD_Categorical_Encoders_1.pkl"
    model_path = directory / "CAD_XGBoost_Model.pkl"
    metadata = load_artifact(metadata_path)
    encoders = load_artifact(encoder_path)
    model = load_artifact(model_path)
    features = metadata["feature_names"]
    booster = model.get_booster()
    labels = {int(value): label for label, value in metadata["target_mapping"].items()}
    if len(features) != 52 or len(set(features)) != 52:
        raise ValueError("Metadata must contain exactly 52 distinct features")
    if any(name.lower() in {"cath", "lad", "lcx", "rca"} for name in features):
        raise ValueError("Forbidden target column in features")
    if model.n_features_in_ != 52 or booster.feature_names != features:
        raise ValueError("Model feature count/order differs from metadata")
    if set(labels) != set(map(int, model.classes_)) or set(labels.values()) != {"CAD", "Normal"}:
        raise ValueError("Target mapping differs from model classes")
    if set(encoders) - set(features):
        raise ValueError("Encoder feature not in metadata")
    encoder_report = {}
    for name, encoder in encoders.items():
        classes = encoder.classes_.tolist()
        if encoder.inverse_transform(encoder.transform(classes)).tolist() != classes:
            raise ValueError(f"Encoder round-trip failed: {name}")
        encoder_report[name] = {"type": type(encoder).__name__, "classes": classes}
    definitions = [
        {"name": name, "type": "categorical" if name in encoders else "numeric",
         **({"allowed_values": encoder_report[name]["classes"]} if name in encoders else {}),
         "required": True,
         "data_type": "encoder label" if name in encoders else "NEEDS_CONFIRMATION",
         "range": "NEEDS_CONFIRMATION"}
        for name in features
    ]
    return {
        "metadata": metadata,
        "files": {p.name: {"sha256": hashlib.sha256(p.read_bytes()).hexdigest(), "bytes": p.stat().st_size} for p in [metadata_path, encoder_path, model_path]},
        "model_type": f"{type(model).__module__}.{type(model).__name__}",
        "model_classes": model.classes_.tolist(),
        "target_labels": labels,
        "model_feature_count": int(model.n_features_in_),
        "model_feature_order": booster.feature_names,
        "booster_version": json.loads(booster.save_config())["version"],
        "encoders": encoder_report,
        "feature_contract": definitions,
        "inspection_environment_versions": {name: importlib.metadata.version(name) for name in ["xgboost", "scikit-learn", "pandas", "numpy", "joblib"]},
        "training_versions": {"scikit-learn": "1.6.1 (serialized encoder state)", "xgboost": "3.4.1 (serialized booster)", "pandas": "NEEDS_CONFIRMATION", "numpy": "NEEDS_CONFIRMATION", "joblib": "NEEDS_CONFIRMATION"},
        "checks": {"model_loaded": True, "feature_count_and_order": True, "class_mapping": True, "all_encoder_roundtrips": True, "golden_prediction": "NOT RUN: trusted dataset row and expected output not supplied"},
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    report = json.dumps(inspect_artifacts(args.artifacts_dir), indent=2)
    print(report)
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(report + "\n")


if __name__ == "__main__":
    main()