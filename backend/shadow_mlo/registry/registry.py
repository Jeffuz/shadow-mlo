import json
import logging
import sqlite3
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
    id          TEXT PRIMARY KEY,
    artifact    TEXT NOT NULL,
    status      TEXT NOT NULL,
    data        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
);
"""


class JobRegistry:
    def __init__(self, db_path: str | Path = "shadow_mlo.db"):
        self._path = str(db_path)
        self._init_db()

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._conn() as conn:
            conn.executescript(SCHEMA)

    def save_job(self, job_dict: dict):
        now = datetime.utcnow().isoformat()
        with self._conn() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO jobs (id, artifact, status, data, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    job_dict["id"],
                    job_dict["artifactName"],
                    job_dict["status"],
                    json.dumps(job_dict),
                    now,
                    now,
                ),
            )
        logger.debug(f"Saved job {job_dict['id']}")

    def update_job(self, job_dict: dict):
        now = datetime.utcnow().isoformat()
        with self._conn() as conn:
            conn.execute(
                "UPDATE jobs SET status = ?, data = ?, updated_at = ? WHERE id = ?",
                (job_dict["status"], json.dumps(job_dict), now, job_dict["id"]),
            )

    def get_job(self, job_id: str) -> dict | None:
        with self._conn() as conn:
            row = conn.execute("SELECT data FROM jobs WHERE id = ?", (job_id,)).fetchone()
        return json.loads(row["data"]) if row else None

    def get_all_jobs(self, limit: int = 50) -> list[dict]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT data FROM jobs ORDER BY created_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [json.loads(r["data"]) for r in rows]

    def clear_all(self):
        with self._conn() as conn:
            conn.execute("DELETE FROM jobs")
        logger.info("Job registry cleared.")
