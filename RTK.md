# RTK - Rust Token Killer (Codex CLI)

**Project-local binary**: `.\.tools\rtk\rtk.exe`
**Smart wrapper for this repo**: `.\scripts\shell-smart.ps1`

## Rule

Trong repo này, khi chạy shell với Codex/PowerShell, ưu tiên:

1. Dùng wrapper thông minh `.\scripts\shell-smart.ps1 "<raw command>"`.
2. Wrapper chỉ tự dùng RTK cho các lệnh khám phá an toàn.
3. Test/build/lint quan trọng sẽ tự chạy raw để giữ terminal đầy đủ cho report.
4. Nếu không có rewrite phù hợp, wrapper tự fallback về lệnh gốc.

Điều này là cách gần nhất với “auto RTK an toàn” trên Windows + Codex.

### Mặc định nên dùng `shell-smart.ps1` cho:

- lệnh khám phá repo: `git status`, `git diff`, `tree`, `find`, `grep`
- `git log`, `git show`, `git blame`
- log khám phá, JSON, diff, dependency summary

### Wrapper sẽ tự bỏ qua RTK và chạy raw cho:

- `pytest`, `python -m pytest`
- `npm/pnpm run test|build|lint`
- `eslint`, `tsc`, `prettier`, `ruff`, `mypy`
- `jest`, `vitest`, `playwright`
- các lệnh test/build tương tự cần terminal đầy đủ để agent viết report

Ví dụ:

```powershell
.\scripts\shell-smart.ps1 "git status"
.\scripts\shell-smart.ps1 "git diff -- frontend/js/chatbot/slide/slideVisualEditorIframe.js"
.\scripts\shell-smart.ps1 "npm run build"
.\scripts\shell-smart.ps1 "pytest -q"
```

Trong 2 ví dụ cuối, wrapper sẽ chạy raw thay vì RTK.

Nếu cần ép dùng RTK trực tiếp:

```powershell
.\scripts\rtk.ps1 git status
```

## Meta Commands

```powershell
.\scripts\rtk.ps1 gain
.\scripts\rtk.ps1 gain --history
.\scripts\rtk.ps1 proxy git diff
```

## Verification

```powershell
.\scripts\shell-smart.ps1 "git status"
.\scripts\rtk.ps1 gain
```
