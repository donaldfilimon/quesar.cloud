"""Archive only the qualified compiled tree; verify all entries without extracting."""
import gzip
import hashlib
import json
import os
from pathlib import Path
import tarfile
from datetime import datetime, timezone

repo = Path.cwd()
evidence = repo / "notes/verification/2026-10-09-finishing/evidence"
qualified = json.loads((evidence / "implementer-trailer-final-hashes.json").read_text())
current = json.loads((evidence / "closure-initial-hashes.json").read_text())
for key in ("baseline", "source_sha256", "installed"):
    assert current[key] == qualified[key], f"Pre-package {key} drift"
for key in ("docs", "public", "persistent"):
    assert current[key]["sha256"] == qualified[key]["sha256"], f"Pre-package {key} drift"
assert qualified["persistent"]["sha256"] == "1b83249443d2aa2144402bd592cba37846a37b44b3a3d748db53610dc157dd34"
root = Path(qualified["persistent"]["root"])
archive = repo / "artifacts/qualified-releases/persistent-node-1b83249443d2aa21-2026-10-09.tar.gz"
assert archive.parent.is_dir()

def sha(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()

def inventory():
    result = {}
    def visit(directory):
        for entry in sorted(directory.iterdir()):
            name = entry.relative_to(root).as_posix()
            assert not any(part.startswith("._") or part in (".DS_Store", "__MACOSX", ".git") for part in entry.relative_to(root).parts), name
            # Runtime secrets must never be packaged. Compiled crypto modules are not keys.
            assert not entry.name.startswith(".env") and entry.suffix.lower() not in (".pem", ".key", ".p12", ".pfx"), name
            if entry.is_symlink():
                entry.resolve(strict=True).relative_to(root.resolve())
                result[name] = {"kind": "symlink", "link": os.readlink(entry)}
            elif entry.is_dir():
                result[name] = {"kind": "directory"}
                visit(entry)
            elif entry.is_file():
                result[name] = {"kind": "file", "bytes": entry.stat().st_size, "sha256": sha(entry)}
            else:
                raise AssertionError(f"Unsupported entry {name}")
    visit(root)
    return result

before = inventory()
files = {name: ({"link": row["link"]} if row["kind"] == "symlink" else {"sha256": row["sha256"], "bytes": row["bytes"]}) for name, row in before.items() if row["kind"] != "directory"}
assert files == qualified["persistent"]["files"], "Qualified file/link manifest mismatch"
# Exclusive creation preserves all older artifacts. Python does not add resource forks/xattrs.
with archive.open("xb") as output:
    with gzip.GzipFile(filename="", mode="wb", fileobj=output, mtime=0) as compressed:
        with tarfile.open(fileobj=compressed, mode="w", format=tarfile.PAX_FORMAT, dereference=False) as bundle:
            for name in before:
                entry = root / name
                info = bundle.gettarinfo(str(entry), arcname=name)
                info.uid = info.gid = 0
                info.uname = info.gname = ""
                info.pax_headers = {}
                if info.isfile():
                    with entry.open("rb") as stream:
                        bundle.addfile(info, stream)
                else:
                    bundle.addfile(info)
seen = set()
regular_bytes = 0
with tarfile.open(archive, mode="r:gz") as bundle:
    for member in bundle:
        assert member.name not in seen, "Duplicate archive entry"
        seen.add(member.name)
        expected = before[member.name]
        if member.isdir():
            assert expected["kind"] == "directory"
        elif member.issym():
            assert expected["kind"] == "symlink" and member.linkname == expected["link"]
        elif member.isfile():
            assert expected["kind"] == "file" and member.size == expected["bytes"]
            with bundle.extractfile(member) as stream:
                assert hashlib.file_digest(stream, "sha256").hexdigest() == expected["sha256"]
            regular_bytes += member.size
        else:
            raise AssertionError("Unsupported archive member")
assert seen == set(before), "Archive entry inventory mismatch"
assert inventory() == before, "Qualified tree changed during packaging"
receipt = {
    "observed_at_utc": datetime.now(timezone.utc).isoformat(),
    "archive": str(archive), "archive_sha256": sha(archive), "archive_bytes": archive.stat().st_size,
    "qualified_tree_sha256": qualified["persistent"]["sha256"],
    "baseline": qualified["baseline"], "qualified_source_sha256": qualified["source_sha256"],
    "entries": len(seen), "regular_files": sum(row["kind"] == "file" for row in before.values()),
    "directories": sum(row["kind"] == "directory" for row in before.values()),
    "symlinks": {name: row["link"] for name, row in before.items() if row["kind"] == "symlink"},
    "regular_file_bytes": regular_bytes, "entry_names_bytes_and_link_spelling_match": True,
    "tree_unchanged_during_packaging": True, "appledouble_entries": 0,
    "secret_file_exclusion": "No .env* or PEM/private-key containers; only the env-scrubbed qualified compiled tree was copied, never private runtime inputs or fixture dumps. Generated build metadata such as nitro.json is included. Not a claim to detect arbitrary unknown secrets in source literals.",
    "supersedes_archive_sha256": "16a98901a8a439d843bcf56cf77353d505fa80dcdc246afe434419999ebe83f2",
    "exit": 0,
}
(evidence / "latest-node-archive.json").write_text(json.dumps(receipt, indent=2) + "\n")
print(json.dumps(receipt, indent=2))
