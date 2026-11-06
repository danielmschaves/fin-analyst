"""O publish acha o projeto dbt mesmo instalado fora do checkout (site-packages)."""

from __future__ import annotations

from pathlib import Path

import pytest

from fin_transform import publish

ROOT = Path(publish.__file__).resolve().parents[1]


def test_variavel_tem_prioridade(monkeypatch, tmp_path):
    (tmp_path / "dbt_project.yml").write_text("name: x\n")
    monkeypatch.setenv("DBT_PROJECT_DIR", str(tmp_path))
    assert publish.project_dir() == tmp_path.resolve()


def test_diretorio_atual(monkeypatch):
    monkeypatch.delenv("DBT_PROJECT_DIR", raising=False)
    monkeypatch.chdir(ROOT)
    assert publish.project_dir() == ROOT


def test_sem_projeto_falha_com_mensagem_clara(monkeypatch, tmp_path):
    monkeypatch.delenv("DBT_PROJECT_DIR", raising=False)
    monkeypatch.chdir(tmp_path)
    monkeypatch.setattr(publish, "PACKAGE_PARENT", tmp_path / "site-packages")
    with pytest.raises(publish.PublishError, match="DBT_PROJECT_DIR"):
        publish.project_dir()
