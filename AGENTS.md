# AGENTS.md

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `base44 dev` as the default local development command when you need the local Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.

## Strict Operational Rule: Absolute Ban on Mock / Dummy / Fabricated People and Names (قاعدة صارمة: منع تام للأسماء والأشخاص الوهميين)

- **CRITICAL & NON-NEGOTIABLE RULE**: Never generate, hardcode, mock, or simulate any fake, placeholder, or dummy persons, customer names, phone numbers, or fabricated conversations in any program, app, database, or UI built for the user.
- **Strictly Real Data Only**: Only 100% authentic, real, synced data from official APIs/webhooks or actual customer interactions may be displayed.
- **Empty State Behavior**: If a channel (such as TikTok, Instagram, WhatsApp, etc.) or feature does not yet have live messages or incoming leads, display a clean empty state (e.g., "لا توجد رسائل حالياً - بانتظار استلام رسائل حقيقية حية" / "0 محادثات - القناة متصلة وبانتظار رسائل العملاء"). NEVER invent fictional people to fill the screen or test views.
- **System Testing**: Technical tests must use explicit technical identifiers (e.g., `Test-Webhook-Ping` or `API-Ping`), never simulated human identities.
