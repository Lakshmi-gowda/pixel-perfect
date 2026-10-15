"""No invented patient rows. Success inference requires a team golden fixture."""
import json
import os
from pathlib import Path
import pickle

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.core.errors import ServiceError
from app.main import create_app
from app.services.artifact_loader import load_bundle
from app.services.preprocessing import preprocess
from scripts.inspect_artifacts import load_artifact

ARTIFACTS = Path(__file__).resolve().parents[1] / "app/ml/artifacts"


@pytest.fixture(scope="module")
def bundle():
    return load_bundle(ARTIFACTS)


@pytest.fixture(scope="module")
def client():
    with TestClient(create_app(Settings(artifacts_dir=ARTIFACTS)), raise_server_exceptions=False) as c:
        yield c


def test_model_contract(bundle):
    assert len(bundle.feature_order) == bundle.model.n_features_in_ == 52
    assert bundle.model.get_booster().feature_names == bundle.feature_order
    assert not {n.lower() for n in bundle.feature_order} & {"cath", "lad", "lcx", "rca"}
    assert bundle.target_labels == {0: "Normal", 1: "CAD"}
    assert len(bundle.encoders) == 18


def test_all_encoder_roundtrips(bundle):
    for encoder in bundle.encoders.values():
        classes = encoder.classes_.tolist()
        assert encoder.inverse_transform(encoder.transform(classes)).tolist() == classes
    assert bundle.encoders["Sex"].classes_.tolist() == ["Fmale", "Male"]


def test_health_and_info(client, bundle):
    assert client.get("/health").json() == {"success": True, "data": {"status": "ok", "model_loaded": True}}
    response = client.get("/model-info")
    assert response.status_code == 200
    info = response.json()["data"]
    assert info["feature_count"] == 52
    assert [f["name"] for f in info["features"]] == bundle.feature_order
    assert all(f["required"] for f in info["features"])
    assert not any("min" in f or "max" in f or "unit" in f for f in info["features"])
    assert "artifacts" not in response.text and ".pkl" not in response.text


def test_missing_inputs_reported_together(client, bundle):
    response = client.post("/predict", json={"features": {}})
    assert response.status_code == 422
    assert set(response.json()["error"]["fields"]) == set(bundle.feature_order)


@pytest.mark.parametrize("name", ["Cath", "LAD", "LCX", "RCA", "lad", "Exertional CP", "unknown"])
def test_forbidden_unknown_fields(client, name):
    response = client.post("/predict", json={"features": {name: None}})
    assert response.status_code == 422
    assert name in response.json()["error"]["fields"]


@pytest.mark.parametrize("value", ["55", None, True, [], {}, float("nan"), float("inf"), -float("inf")])
def test_numeric_wrong_types_and_nonfinite(bundle, value):
    with pytest.raises(ServiceError) as failure:
        preprocess({"Age": value}, bundle)
    assert "Age" in failure.value.fields


def test_wrong_category(client):
    response = client.post("/predict", json={"features": {"Sex": "Female"}})
    assert response.status_code == 422
    assert "Fmale" in response.json()["error"]["fields"]["Sex"][0]


@pytest.mark.parametrize("body", ["{", "[]", "null", '{"features": []}', '{"features": {}, "extra": 1}', '{"features": {}, "features": {}}'])
def test_malformed_or_bad_body(client, body):
    response = client.post("/predict", content=body, headers={"Content-Type": "application/json"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_REQUEST"


def test_content_type(client):
    assert client.post("/predict", content="{}").status_code == 400


def test_body_limit_and_cors(client):
    response = client.post("/predict", content=" " * 65537, headers={"Content-Type": "application/json", "Origin": "http://localhost:8080"})
    assert response.status_code == 413
    assert response.headers["access-control-allow-origin"] == "http://localhost:8080"


@pytest.mark.parametrize("origin", [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:8080",
])
def test_cors_preflight(client, origin):
    response = client.options("/predict", headers={"Origin": origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "Content-Type"})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin
    blocked = client.options("/predict", headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in blocked.headers


def test_unavailable_is_fail_closed(tmp_path):
    with TestClient(create_app(Settings(artifacts_dir=tmp_path))) as c:
        assert c.get("/health").status_code == 503
        assert c.get("/health").json()["data"]["model_loaded"] is False
        assert c.get("/model-info").status_code == 503
        assert c.post("/predict", json={"features": {}}).status_code == 503


def test_restricted_loader_rejects_arbitrary_globals(tmp_path):
    path = tmp_path / "unsupported.pkl"
    path.write_bytes(pickle.dumps(Path("unsupported")))
    with pytest.raises(ValueError, match="Unsupported serialized class"):
        load_artifact(path)


def test_wildcard_cors_rejected():
    with pytest.raises(ValueError):
        Settings(cors_origins=("*",))


def test_production_cors_accepts_local_development_origins():
    Settings(
        env="production",
        cors_origins=(
            "https://aurapulse.example",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:8080",
        ),
    )


def test_production_cors_requires_https_frontend_origin():
    with pytest.raises(ValueError, match="at least one HTTPS"):
        Settings(env="production", cors_origins=("http://localhost:5173",))


def test_golden_prediction(client, bundle):
    path = os.getenv("GOLDEN_FIXTURE")
    if not path:
        pytest.skip("Team real dataset row and expected Colab probabilities not supplied")
    fixture = json.loads(Path(path).read_text())
    frame = preprocess(fixture["features"], bundle)
    assert list(frame.columns) == bundle.feature_order
    # Reference probabilities must come from the team, never API-generated.
    response = client.post("/predict", json={"features": fixture["features"]})
    assert response.status_code == 200
    result = response.json()["data"]
    assert result["prediction"] == fixture["prediction"]
    direct = bundle.model.predict_proba(frame)[0]
    for i, c in enumerate(bundle.model.classes_):
        label = bundle.target_labels[int(c)]
        assert result["probabilities"][label] == float(direct[i])
        assert np.isclose(result["probabilities"][label], fixture["probabilities"][label], atol=1e-6, rtol=0)
    assert np.isclose(sum(result["probabilities"].values()), 1)
    assert "vessels" not in result and "contributions" not in result