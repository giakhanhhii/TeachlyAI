# External Dependencies

The slide shell templates in this directory are static HTML themes. Several themes load fonts from Google Fonts and icon styles from Font Awesome CDN:

- Google Fonts: `fonts.googleapis.com` / `fonts.gstatic.com`
- Font Awesome CSS: `cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css`

These links are theme dependencies, not user-provided URLs. If offline or fully self-hosted operation is required, mirror the required font files and Font Awesome CSS under a local static asset directory, then update each template link to point at that local path.

Runtime slide content is injected by `frontend/js/chatbot/slide/slideShellSrcdoc.js` using DOM APIs and `textContent` for user-provided title and bullet text.
