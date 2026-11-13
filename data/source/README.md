# Canonical normalized source snapshot

`role-data.yaml` is the reviewable, versioned source snapshot for the published
WCAG by Role data. It preserves the normalized W3C WCAG 2.2 criterion metadata,
ARRM task text and task-level primary/secondary/contributor ownership, the
separate criterion-level summary, Understanding excerpts and provenance hashes.

It is generated from the production importer, not hand-edited:

```sh
python3 -m pip install -r requirements.txt
python3 scripts/pipeline.py --mode production
python3 scripts/migrate_source.py \
  --input dist/data/role-data.json \
  --yaml-out data/source/role-data.yaml \
  --json-out dist/data/role-data.json \
  --expect-criteria 86 --expect-tasks 262 --expect-roles 5
```

The migration step writes the YAML, reads it back, validates it and regenerates
`dist/data/role-data.json` from the YAML. CI fails rather than deploying if the
snapshot or round-trip is invalid.

To check a local snapshot without writing it:

```sh
python3 scripts/migrate_source.py --input dist/data/role-data.json --check
```

Do not change W3C or ARRM wording or ownership in this file. If upstream data
changes, regenerate the snapshot and review the diff. Editorial role profiles
and interpretations belong in a separate, clearly labelled layer, not here.
