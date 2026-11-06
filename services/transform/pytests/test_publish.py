"""P1–P3: publish só com testes verdes, swap sem erro para quem lê, rollback."""

from __future__ import annotations

import threading
import time

import psycopg
import pytest

from fin_transform.publish import PublishError, publish, rollback

pytestmark = pytest.mark.db


def build_version(conn: psycopg.Connection, version: int):
    def build() -> tuple[bool, str]:
        conn.execute("CREATE TABLE marts_next.mart_asset_index (ticker text, version int)")
        conn.execute(
            "INSERT INTO marts_next.mart_asset_index SELECT 'T' || g, %s FROM generate_series(1, 500) g",
            (version,),
        )
        return True, f"build v{version} ok"

    return build


def published_version(conn) -> int:
    return conn.execute("SELECT DISTINCT version FROM marts.mart_asset_index").fetchone()[0]


def test_publica_e_registra(pg):
    assert publish(pg, build_version(pg, 1)).startswith("publicado")
    assert published_version(pg) == 1
    # marts_next volta vazio para o próximo build
    left = pg.execute("SELECT count(*) FROM pg_tables WHERE schemaname = 'marts_next'").fetchone()[
        0
    ]
    assert left == 0
    assert pg.execute("SELECT status FROM ingest.publishes").fetchall() == [("published",)]


def test_p1_teste_falhando_nao_troca_nada(pg):
    publish(pg, build_version(pg, 1))

    def failing() -> tuple[bool, str]:
        build_version(pg, 2)()
        return False, "FAIL 1 assert_sentinela_poc"

    with pytest.raises(PublishError, match="marts não foi alterado"):
        publish(pg, failing)
    assert published_version(pg) == 1
    statuses = [
        r[0] for r in pg.execute("SELECT status FROM ingest.publishes ORDER BY id").fetchall()
    ]
    assert statuses == ["published", "failed"]


def test_p2_leitura_continua_sem_erro_durante_o_swap(pg, pg_url):
    publish(pg, build_version(pg, 1))
    errors: list[str] = []
    seen: set[int] = set()
    reads = 0
    stop = threading.Event()

    def reader():
        nonlocal reads
        with psycopg.connect(pg_url, autocommit=True) as rconn:
            while not stop.is_set():
                try:
                    row = rconn.execute(
                        "SELECT count(*), min(version) FROM marts.mart_asset_index"
                    ).fetchone()
                    assert row[0] == 500, row  # nunca uma tabela vazia ou pela metade
                    seen.add(row[1])
                    reads += 1
                except Exception as exc:  # noqa: BLE001
                    errors.append(repr(exc))

    threads = [threading.Thread(target=reader) for _ in range(4)]
    for t in threads:
        t.start()
    for v in range(2, 12):  # dez publicações seguidas com leitura em paralelo
        publish(pg, build_version(pg, v))
        time.sleep(0.02)
    stop.set()
    for t in threads:
        t.join()
    assert errors == []
    assert reads > 50
    assert published_version(pg) == 11 and len(seen) > 1


def test_p3_rollback(pg):
    publish(pg, build_version(pg, 1))
    publish(pg, build_version(pg, 2))
    rollback(pg)
    assert published_version(pg) == 1
    rollback(pg)  # e volta de novo
    assert published_version(pg) == 2


def test_rollback_sem_publicacao_anterior(pg):
    with pytest.raises(PublishError):
        rollback(pg)
