# Deployment

Tabula produces a fully static site — a folder of HTML, CSS, and JavaScript files. It can be hosted on any platform that serves static files.

The general rule: copy the contents of `src/` and your `api.json` into the same folder, then serve that folder.

---

## GitHub Pages

### From a branch

1. Push your `src/` contents and `api.json` to the root of a branch (e.g. `gh-pages`), or into a `/docs` subfolder on `main`.
2. Go to **Settings → Pages** in your repository.
3. Set the source to your branch and folder, then save.
4. GitHub Pages will publish at `https://<user>.github.io/<repo>/`.

### With GitHub Actions (recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: src          # the folder that contains index.html + api.json
      - uses: actions/deploy-pages@v4
        id: deployment
```

> **Note** — Make sure `api.json` is inside the `src/` folder before deploying.

---

## Vercel

1. Push your project to GitHub, GitLab, or Bitbucket.
2. Import the project in the [Vercel dashboard](https://vercel.com/new).
3. Set the **Output Directory** to `src` (or whichever folder contains `index.html`).
4. Leave **Build Command** empty — there is no build step.
5. Deploy.

Alternatively, deploy directly from the CLI:

```bash
npx vercel --prod
```

Vercel will prompt for the directory to deploy — enter `src`.

---

## Netlify

### Drag and drop

1. Open the [Netlify dashboard](https://app.netlify.com) and go to **Sites**.
2. Drag your `src/` folder (with `api.json` inside) onto the drop zone.
3. Netlify publishes it instantly.

### From Git

1. Connect your repository.
2. Set **Publish directory** to `src`.
3. Leave **Build command** empty.
4. Deploy.

### `netlify.toml`

```toml
[build]
  publish = "src"
```

---

## Cloudflare Pages

1. Connect your repository in the [Cloudflare Pages dashboard](https://dash.cloudflare.com).
2. Set **Build output directory** to `src`.
3. Leave **Build command** empty.
4. Deploy.

Cloudflare Pages also supports direct uploads:

```bash
npx wrangler pages deploy src --project-name my-api-docs
```

---

## Any nginx / Apache server

Copy the contents of `src/` and your `api.json` to your web root:

```bash
scp -r src/* api.json user@server:/var/www/html/api-docs/
```

No server-side configuration needed — all files are static.

---

## Local preview

```bash
# Python (no install needed)
cd src && python -m http.server 8080

# Node (via CLI)
npx tabula-docs serve src

# Or any other static server
npx serve src
npx http-server src
```

Open [http://localhost:8080](http://localhost:8080).
