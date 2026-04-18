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

## Logo and favicon

```json
"settings": {
  "logo": "/assets/logo.svg",
  "favicon": "/assets/favicon.ico"
}
```

Both fields accept a relative path (served from your static folder) or an absolute URL.

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

| Key           | CSS variable    | Applies to                                      |
| ------------- | --------------- | ----------------------------------------------- |
| `accent`      | `--accent`      | Buttons, active states, focus rings             |
| `accentLight` | `--accent-light`| Tinted backgrounds on hover                     |
| `accentDark`  | `--accent-dark` | Text on tinted backgrounds                      |
| `colorGet`    | `--blue`        | GET method badge and endpoint header tint       |
| `colorPost`   | `--purple`      | POST method badge and endpoint header tint      |
| `colorPut`    | `--orange`      | PUT method badge and endpoint header tint       |
| `colorDelete` | `--red`         | DELETE method badge and endpoint header tint    |
| `fontBody`    | `--font-body`   | All body text                                   |
| `fontMono`    | `--font-mono`   | Code blocks, response previews                  |

> **Note** — Method background tints are derived automatically using `rgb(from var(--blue) r g b / 0.15)`. Changing `colorGet`, `colorPost`, `colorPut`, or `colorDelete` updates both the solid badge and the transparent tint in one go.

---

## Full theming example

```json
"settings": {
  "title": "Acme API",
  "description": "Internal REST API for the Acme platform",
  "version": "2.3.1",
  "baseUrl": "/api",
  "logo": "/assets/logo.svg",
  "favicon": "/assets/favicon.ico",
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
