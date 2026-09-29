# منصتي — Manasati

Arabic RTL website builder with a React frontend, FastAPI backend and MongoDB.

See [implementation notes and remaining integration requirements](docs/IMPLEMENTATION.md).

## Development

- Configure backend environment using `backend/.env.example`; secrets stay on the server.
- Install `backend/requirements.txt` in a Python virtual environment and run `uvicorn server:app` from `backend`.
- From `frontend`, run `npm ci --legacy-peer-deps`, then `npm run build` or `npm start`. Empty `REACT_APP_BACKEND_URL` expects same-origin `/api` routing.
- Production must serve SPA routes through `index.html` and proxy `/api` to FastAPI.
- No administrator is created unless both `ADMIN_EMAIL` and `ADMIN_PASSWORD` are supplied for an initial account.
- New merchant payments and payouts are test-only. Read the implementation notes before enabling provider flags.

## Isolated acceptance tests

Install `backend/requirements-test.txt`, then run:

```sh
python -m pytest backend/tests/test_completion.py -q
```

For the UI acceptance suite, install Playwright + Chromium and run `tests.preview_server` under local HTTPS, port 8443. Then `node tests/ui-smoke.cjs`. This server always uses a disposable in-memory database and is **not** a deployment entrypoint.
