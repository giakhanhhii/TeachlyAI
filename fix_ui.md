Remove the redundant `slide_html_template/` directory from the root and consolidate everything into `frontend/slide_html_template/`.

1. **Update Backend**: In `src/api_server.py`, change `SLIDE_HTML_DIR` to point to `REPO_ROOT / "frontend" / "slide_html_template"`.
2. **Update Scripts**: In `scripts/apply_slide_shell_bodies.py`:
   - Set `DIR` to `ROOT / "frontend" / "slide_html_template"`.
   - Update `BODY_BY_FILE` to use `"4.space-bright.html"` instead of `"4.thptqg.html"`.
   - Remove the `shutil.copy2` mirroring loop at the end of `main()`.
3. **Cleanup**: Delete the root `slide_html_template/` directory.
4. **Rename**: Ensure `frontend/slide_html_template/4.thptqg.html` is moved to `frontend/slide_html_template/4.space-bright.html` if it hasn't been already.
