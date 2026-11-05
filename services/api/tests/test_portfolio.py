import json

from fastapi.testclient import TestClient

from app.fixtures import fixtures_dir
from app.main import app
from app.schema import SCHEMA_PATH, render

client = TestClient(app)


def fixture() -> dict:
    return json.loads((fixtures_dir() / "portfolio.json").read_text(encoding="utf-8"))


def test_portfolio_returns_the_shared_fixture() -> None:
    response = client.get("/portfolio")
    assert response.status_code == 200
    assert response.json() == fixture()


def test_portfolio_numbers() -> None:
    body = client.get("/portfolio").json()
    assert len(body["positions"]) == 7
    assert round(sum(p["marketValue"] for p in body["positions"]), 2) == 16188.02
    assert body["referenceDate"] == "2026-10-31"
    cdb = next(p for p in body["positions"] if p["ticker"] == "CDB DI")
    assert cdb["price"] is None and cdb["score"] is None


def test_schema_file_is_up_to_date() -> None:
    """O schema em packages/contracts precisa bater com os modelos (`python -m app.schema`)."""
    assert SCHEMA_PATH.read_text(encoding="utf-8") == render()


def test_schema_uses_camel_case_and_forbids_extra_fields() -> None:
    schema = json.loads(render())
    assert set(schema["required"]) == {
        "referenceDate",
        "positions",
        "month",
        "return12mPct",
        "dividendYieldPct",
        "dividends",
        "history",
    }
    assert schema["additionalProperties"] is False
    position = schema["$defs"]["PortfolioPosition"]
    assert "monthChangePct" in position["properties"]
    assert position["additionalProperties"] is False
