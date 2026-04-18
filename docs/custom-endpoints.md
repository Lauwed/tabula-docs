# Custom endpoints

`customEndpoints` let you document any endpoint that does not map to the standard CRUD pattern — actions, state transitions, bulk operations, file uploads, and more.

---

## When to use `customEndpoints`

Use a custom endpoint when the operation:

- Has a verb-like name (`/publish`, `/ship`, `/archive`).
- Operates on a sub-resource (`/orders/{ID}/items`).
- Uses a non-standard HTTP method for the resource (e.g. a second `POST` on the same URI).
- Requires a multipart body.
- Has unique responses that don't fit the default CRUD shape.

---

## Basic structure

Add a `customEndpoints` array to any table:

```json
{
  "name": { "singular": "post", "plural": "posts" },
  "uri": "/posts",
  "customEndpoints": [
    {
      "name": "publish",
      "description": "Sets the post status to PUBLISHED and notifies subscribers.",
      "uri": "/{ID}/publish",
      "method": "POST",
      "responses": [
        { "code": 200, "response": { "message": "Post published" } },
        { "code": 409, "response": { "code": 409, "message": "Post is already published" } },
        401,
        403,
        404,
        500
      ]
    }
  ]
}
```

The resolved URI for this endpoint would be `/posts/{ID}/publish`.

---

## Field reference

| Field             | Type                                    | Required | Description                                                           |
| ----------------- | --------------------------------------- | -------- | --------------------------------------------------------------------- |
| `name`            | `string`                                | yes      | Display name — must be unique within the table                        |
| `description`     | `string`                                | no       | Shown below the endpoint title in the UI                              |
| `uri`             | `string`                                | yes      | Path appended to the table `uri` (e.g. `"/{ID}/ship"`)               |
| `method`          | `"GET" \| "POST" \| "PUT" \| "DELETE"` | yes      | HTTP method                                                           |
| `tokenRequired`   | `boolean`                               | no       | Defaults: `false` for GET, `true` for POST/PUT/DELETE                 |
| `responses`       | `Response[]`                            | no       | Expected responses — supports full objects and integer shorthands     |
| `body`            | `object`                                | no       | JSON body schema displayed and pre-filled in the UI                   |
| `queryParameters` | `QueryParameter[]`                      | no       | URL query parameters rendered as form fields                          |
| `uriParameters`   | `UriParameter[]`                        | no       | Additional path parameters beyond those inherited from the table      |

---

## Response entries

Each entry in `responses` can be either a **full object** or an **integer shorthand**.

### Full object

```json
{ "code": 200, "response": { "message": "Shipped successfully", "trackingNumber": "string" } }
```

Error responses (code ≥ 400) must include a `response` object with a matching `code` and a non-empty `message`.

### Integer shorthand

```json
401
```

The integer must reference a code declared in `defaultErrors`. At runtime, Tabula resolves it to the full response object defined there.

### Mixing both

```json
"responses": [
  { "code": 200, "response": { "id": "integer", "status": "SHIPPED" } },
  { "code": 409, "response": { "code": 409, "message": "Order not in CONFIRMED state" } },
  401,
  403,
  404,
  500
]
```

---

## Overriding a standard endpoint

If a custom endpoint's resolved URI and method exactly match a standard one, it **replaces** it instead of adding a new entry. This is useful for providing a richer description or custom responses for e.g. `PUT /{ID}`.

---

## Multipart file upload

Set `multipart: true` inside the `body` to render a file drop zone instead of a JSON textarea:

```json
{
  "name": "upload-image",
  "description": "Uploads a product image. Automatically converted to WebP.",
  "uri": "/{ID}/image",
  "method": "POST",
  "body": {
    "multipart": true,
    "fields": [
      {
        "name": "file",
        "label": "Image (JPEG or PNG — max 5 MB)",
        "type": "file",
        "required": true,
        "accept": ["image/jpeg", "image/png"],
        "maxWeight": 5
      },
      {
        "name": "alt",
        "label": "Alt text",
        "type": "string",
        "required": false
      }
    ]
  },
  "responses": [
    { "code": 200, "response": { "id": "integer", "imageUrl": "string" } },
    { "code": 413, "response": { "code": 413, "message": "File too large" } },
    { "code": 415, "response": { "code": 415, "message": "Unsupported media type" } },
    401,
    500
  ]
}
```

See `examples/ecommerce/api.json` for a full working example.
