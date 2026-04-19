# Theming

Tabula's appearance is fully controlled from the `settings` block in your `api.json`. No CSS editing required.

---

## Title, description, and version

```json
"settings": {
  "title": "Acme API",
  "description": "Internal REST API for the Acme platform",
  "version": "2.3.1"
}
```

- `title` sets both the browser tab title and the `<h1>` in the header.
- `description` appears as a subtitle below the title.
- `version` renders as a small badge next to the title (e.g. `v2.3.1`).

---

## Logo

```json
"settings": {
  "logo": "./logo.svg"
}
```

The `logo` field accepts:

- A **relative path** from the folder you serve (e.g. `"./logo.svg"`, `"./assets/logo.png"`).
- An **absolute URL** (e.g. `"https://cdn.example.com/logo.svg"`).

The image is rendered at **36 px tall** in the header, with `width: auto` to preserve aspect ratio. Any web-compatible format works: SVG, PNG, WebP, or JPEG.

> **Default** — When you scaffold a project with `tabula init`, a `logo.svg` file is included in the output folder. It uses the Tabula icon and wordmark and can be replaced at any time.

---

## Favicon

```json
"settings": {
  "favicon": "./favicon.svg"
}
```

The `favicon` field accepts the same values as `logo`: a relative path or an absolute URL.

Supported formats: **SVG** (recommended — scales to any size, works in all modern browsers), **PNG**, or **ICO**.

> **Default** — `tabula init` also copies a `favicon.svg` into your docs folder. It uses the Tabula table-grid icon. Replace it with your own to match your project branding.

### Using a relative path

Place your files next to `index.html` and reference them with `./`:

```
my-docs/
├── index.html
├── api.json
├── logo.svg        ← referenced as "./logo.svg"
└── favicon.svg     ← referenced as "./favicon.svg"
```

```json
"settings": {
  "logo": "./logo.svg",
  "favicon": "./favicon.svg"
}
```

---

## Header navigation links

```json
"settings": {
  "links": [
    { "label": "GitHub", "url": "https://github.com/acme/api" },
    { "label": "Status", "url": "https://status.acme.com" }
  ]
}
```

Links are rendered in the top-right of the header and open in a new tab.

---

## Colors

### Light mode — `theme`

```json
"settings": {
  "theme": {
    "accent":      "#e85d04",
    "accentLight": "#fff0e0",
    "accentDark":  "#7c2900",
    "colorGet":    "#0077b6",
    "colorPost":   "#7b2d8b",
    "colorPut":    "#c77a00",
    "colorDelete": "#c1121f",
    "fontBody":    "\"Inter\", sans-serif",
    "fontMono":    "\"Fira Code\", monospace"
  }
}
```

### Dark mode — `darkTheme`

Applied automatically when `prefers-color-scheme: dark` is active. Accepts the same color keys as `theme` (font fields are excluded — font families are not mode-specific).

```json
"settings": {
  "darkTheme": {
    "accent":      "#ff9f1c",
    "accentLight": "#2a1800",
    "accentDark":  "#ffd166",
    "colorGet":    "#48cae4",
    "colorPost":   "#c77dff",
    "colorPut":    "#f4a261",
    "colorDelete": "#e63946"
  }
}
```

### Color reference

| Key           | CSS variable     | Applies to                                   |
| ------------- | ---------------- | -------------------------------------------- |
| `accent`      | `--accent`       | Buttons, active states, focus rings          |
| `accentLight` | `--accent-light` | Tinted backgrounds on hover                  |
| `accentDark`  | `--accent-dark`  | Text on tinted backgrounds                   |
| `colorGet`    | `--blue`         | GET method badge and endpoint header tint    |
| `colorPost`   | `--purple`       | POST method badge and endpoint header tint   |
| `colorPut`    | `--orange`       | PUT method badge and endpoint header tint    |
| `colorDelete` | `--red`          | DELETE method badge and endpoint header tint |
| `fontBody`    | `--font-body`    | All body text                                |
| `fontMono`    | `--font-mono`    | Code blocks, response previews               |

> **Note** — Method background tints are derived automatically using `rgb(from var(--blue) r g b / 0.15)`. Changing `colorGet`, `colorPost`, `colorPut`, or `colorDelete` updates both the solid badge and the transparent tint in one go.

---

## Full theming example

```json
"settings": {
  "title": "Acme API",
  "description": "Internal REST API for the Acme platform",
  "version": "2.3.1",
  "baseUrl": "/api",
  "logo": "./logo.svg",
  "favicon": "./favicon.svg",
  "links": [
    { "label": "GitHub", "url": "https://github.com/acme/api" },
    { "label": "Status", "url": "https://status.acme.com" }
  ],
  "theme": {
    "accent": "#e85d04",
    "accentLight": "#fff0e0",
    "accentDark": "#7c2900",
    "colorGet": "#0077b6",
    "colorPost": "#7b2d8b",
    "colorPut": "#c77a00",
    "colorDelete": "#c1121f",
    "fontBody": "\"Inter\", sans-serif",
    "fontMono": "\"Fira Code\", monospace"
  },
  "darkTheme": {
    "accent": "#ff9f1c",
    "accentLight": "#2a1800",
    "accentDark": "#ffd166",
    "colorGet": "#48cae4",
    "colorPost": "#c77dff",
    "colorPut": "#f4a261",
    "colorDelete": "#e63946"
  }
}
```
