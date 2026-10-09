"""Verify local exact-hash masters against the current published catalog; no remote fetch."""
from pathlib import Path
import hashlib
import json
import re
from datetime import datetime, timezone

repo = Path.cwd()
folder = repo / "notes/verification/2026-10-09-finishing"
worksheet = folder / "film-review.md"
text = worksheet.read_text()
rows = re.findall(r"^\| \[([^]]+)\]\(([^)]+)\) \| ([a-f0-9]{64}) \| Pending \| Pending \|$", text, re.M)
catalog = json.loads((repo / "src/lib/trailer-editions.generated.json").read_text())
assert len(rows) == len(catalog) == 16
assert len({row[0] for row in rows}) == 16
by_master = {entry["master"]: entry for entry in catalog}
assert {name + ".mp4" for name, *_ in rows} == set(by_master)
receipts = []
for name, href, expected in rows:
    local = Path(href)
    if not local.is_absolute():
        local = (worksheet.parent / local).resolve()
    entry = by_master[name + ".mp4"]
    assert local.name == entry["master"] and local.is_file()
    with local.open("rb") as stream:
        actual = hashlib.file_digest(stream, "sha256").hexdigest()
    assert actual == expected == entry["sha256"], f"Current master drift: {name}"
    proof = json.loads((repo / entry["proof"]).read_text())
    assert proof["sha256"] == actual
    assert proof["listeningReview"] == proof["visualReview"] == "pending"
    assert proof["listeningAccepted"] is False and proof["visualReviewAccepted"] is False
    receipts.append({"master": name, "local": str(local), "published_catalog_url": entry["video"], "sha256": actual, "bytes": local.stat().st_size, "full_listening": "Pending", "full_motion": "Pending"})
receipt = {"observed_at_utc": datetime.now(timezone.utc).isoformat(), "worksheet": str(worksheet), "masters": receipts, "count": 16, "total_bytes": sum(row["bytes"] for row in receipts), "local_hashes_match_current_catalog_and_proof": True, "remote_download_or_audiovisual_review": False, "exit": 0}
(folder / "evidence/film-worksheet-current.json").write_text(json.dumps(receipt, indent=2) + "\n")
print(f"Verified {len(receipts)} exact-hash local masters, current published URLs/proof and all32pending full-review fields; no remote or audiovisual review.")
