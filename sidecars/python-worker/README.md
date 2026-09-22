# Python document worker

> **Provenance:** copied on 2026-09-22 from `donaldfilimon/MLAI-CORPORATION-WWW`
> `sidecars/python-worker` at `b6f3686b7316b1afcc5c780611c47f51750a26ae`
> (committed files only, via `git archive`). Files are unchanged; this note is
> the only edit. `bootstrap.py` was not run here (it downloads the Tika jar and
> model assets). Note that `bootstrap.py` and `extract.py` resolve `ROOT` to the
> parent `sidecars/` directory, and `bootstrap.py` expects a `worker/`
> subdirectory there, a layout mismatch inherited unchanged from mlai.

Optional sidecar for the MLAI app. The app reaches it only by a configured URL.
A closed port is unavailable. The app does not spawn this process.

Run it yourself when a document pipeline is needed. Python 3.11–3.13 and uv
match `pyproject.toml`. A local model is optional. This worker does not
provision an Abbey session or a shared product account.
