# Repo-local Skills

This repo requires local skills in this directory so the implementation workflow is self-contained.

Installed skills:
- `proto` -> `.agents/skills/proto`
- `moon` -> `.agents/skills/moon`

Install/refresh command:
```bash
python3 "$HOME/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py" \
  --repo hyperb1iss/moonrepo-skill \
  --path skills/proto skills/moon \
  --dest "$(pwd)/.agents/skills"
```

After installing or refreshing skills, restart Codex.
