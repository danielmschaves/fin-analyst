"""Lake em armazenamento S3-compatível (Cloudflare R2 em produção, moto em dev e testes).

bronze/{source}/{dataset}/dt=AAAA-MM-DD/{run_id}/{arquivo}  — como chegou, imutável (+ manifest)
bronze/_index/{source}/{dataset}/{sha256}                   — marcador para deduplicar reenvios
silver/{dataset}/{partição…}/part-0.parquet                 — tipado e validado (zstd), sobrescrito
quarantine/{dataset}/{partição…}/{run_id}.parquet           — linhas rejeitadas com o motivo
"""

from __future__ import annotations

import hashlib
import io
import json
from dataclasses import dataclass
from datetime import UTC, datetime

import boto3
import polars as pl
from botocore.exceptions import ClientError

from .config import Settings


def make_s3_client(settings: Settings):
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
        region_name=settings.s3_region,  # "auto" no R2
    )


def _partition_path(partition: dict[str, object]) -> str:
    return "/".join(f"{k}={v}" for k, v in partition.items())


@dataclass(frozen=True)
class BronzeResult:
    key: str
    sha256: str
    size: int
    duplicate: bool


class Lake:
    def __init__(self, s3, bucket: str):
        self.s3 = s3
        self.bucket = bucket

    def _exists(self, key: str) -> bool:
        try:
            self.s3.head_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in {"404", "NoSuchKey", "NotFound"}:
                return False
            raise

    def put_bronze(
        self, source: str, dataset: str, dt: str, run_id: str, filename: str, data: bytes
    ) -> BronzeResult:
        """Grava o arquivo como chegou. Se o mesmo conteúdo (sha256) já existe, não grava de novo."""
        sha = hashlib.sha256(data).hexdigest()
        index_key = f"bronze/_index/{source}/{dataset}/{sha}"
        key = f"bronze/{source}/{dataset}/dt={dt}/{run_id}/{filename}"
        if self._exists(index_key):
            existing = self.s3.get_object(Bucket=self.bucket, Key=index_key)["Body"].read().decode()
            return BronzeResult(existing, sha, len(data), duplicate=True)
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=data)
        manifest = {
            "source": source,
            "dataset": dataset,
            "dt": dt,
            "run_id": run_id,
            "file": filename,
            "sha256": sha,
            "bytes": len(data),
            "ingested_at": datetime.now(UTC).isoformat(),
        }
        self.s3.put_object(
            Bucket=self.bucket,
            Key=f"{key}.manifest.json",
            Body=json.dumps(manifest).encode(),
            ContentType="application/json",
        )
        self.s3.put_object(Bucket=self.bucket, Key=index_key, Body=key.encode())
        return BronzeResult(key, sha, len(data), duplicate=False)

    def write_silver(self, dataset: str, partition: dict[str, object], df: pl.DataFrame) -> str:
        """Sobrescreve a partição inteira (idempotente)."""
        key = f"silver/{dataset}/{_partition_path(partition)}/part-0.parquet"
        buf = io.BytesIO()
        df.write_parquet(buf, compression="zstd")
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=buf.getvalue())
        return key

    def read_silver(self, dataset: str, partition: dict[str, object]) -> pl.DataFrame:
        key = f"silver/{dataset}/{_partition_path(partition)}/part-0.parquet"
        body = self.s3.get_object(Bucket=self.bucket, Key=key)["Body"].read()
        return pl.read_parquet(io.BytesIO(body))

    def put_quarantine(
        self, dataset: str, partition: dict[str, object], run_id: str, df: pl.DataFrame
    ) -> str | None:
        if df.is_empty():
            return None
        key = f"quarantine/{dataset}/{_partition_path(partition)}/{run_id}.parquet"
        buf = io.BytesIO()
        df.write_parquet(buf, compression="zstd")
        self.s3.put_object(Bucket=self.bucket, Key=key, Body=buf.getvalue())
        return key

    def size(self, prefix: str = "") -> tuple[int, int]:
        """(objetos, bytes) sob um prefixo — para as medições da PoC."""
        objects = total = 0
        paginator = self.s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
            for obj in page.get("Contents", []):
                objects += 1
                total += obj["Size"]
        return objects, total
