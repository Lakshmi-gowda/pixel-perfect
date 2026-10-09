import hashlib
from dataclasses import dataclass
from pathlib import Path

from scripts.inspect_artifacts import load_artifact


EXCLUDED = {"cath", "lad", "lcx", "rca"}


@dataclass
class ModelBundle:
    model: object
    encoders: dict
    feature_order: list[str]
    target_labels: dict[int, str]
    version: str

    def model_info(self):
        return {
            "model_name": "XGBoost CAD classifier", "model_version": self.version,
            "feature_count": len(self.feature_order),
            "features": [{"name": name, "type": "categorical" if name in self.encoders else "numeric",
                          **({"allowed_values": self.encoders[name].classes_.tolist()} if name in self.encoders else {}),
                          "required": True} for name in self.feature_order],
            "classes": [self.target_labels[int(c)] for c in self.model.classes_],
        }


def load_bundle(directory: Path) -> ModelBundle:
    model_path = directory / "CAD_XGBoost_Model.pkl"
    encoder_path = directory / "CAD_Categorical_Encoders.pkl"
    if not encoder_path.exists():
        encoder_path = directory / "CAD_Categorical_Encoders_1.pkl"
    model = load_artifact(model_path)
    metadata = load_artifact(directory / "CAD_XGBoost_Metadata.pkl")
    encoders = load_artifact(encoder_path)
    order = metadata["feature_names"]
    if not isinstance(order, list) or len(order) != 52 or len(set(order)) != 52 or any(not isinstance(n, str) or n.lower() in EXCLUDED for n in order):
        raise ValueError("Invalid 52-feature metadata contract")
    if model.n_features_in_ != 52 or model.get_booster().feature_names != order:
        raise ValueError("Model and metadata feature count/order differ")
    labels = {int(value): name for name, value in metadata["target_mapping"].items()}
    if len(labels) != 2 or set(labels.values()) != {"Normal", "CAD"} or set(labels) != set(map(int, model.classes_)):
        raise ValueError("Target class mapping is inconsistent")
    # 18 categorical encoders are confirmed by these artifacts and the PRD.
    if not isinstance(encoders, dict) or len(encoders) != 18 or set(encoders) - set(order):
        raise ValueError("Categorical encoder contract is incomplete")
    for name, encoder in encoders.items():
        classes = encoder.classes_.tolist()
        if not classes or encoder.inverse_transform(encoder.transform(classes)).tolist() != classes:
            raise ValueError(f"Categorical encoder check failed: {name}")
    digest = hashlib.sha256()
    for path in [model_path, directory / "CAD_XGBoost_Metadata.pkl", encoder_path]:
        digest.update(path.read_bytes())
    return ModelBundle(model, encoders, list(order), labels, "sha256:" + digest.hexdigest())