<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Backend API & Environment Configuration

- **Backend Base URL**: Use `localhost/api/` (proxied via Nginx reverse proxy) for all frontend API calls.
- **Backend Port & Service**: The backend service runs originally at port `3000`.
- **Backend Configuration**: Reference the Docker Compose and gateway configurations in [/home/idebian/mydrive/Projects/WebstormProjects/easy_com_backend/docker-compose.yml](file:///home/idebian/mydrive/Projects/WebstormProjects/easy_com_backend/docker-compose.yml).
- **Backend Documentation**: Refer to the backend documentation at [/home/idebian/mydrive/Projects/WebstormProjects/easy_com_backend/docs](file:///home/idebian/mydrive/Projects/WebstormProjects/easy_com_backend/docs) for endpoints and interface contracts (e.g., [frontend_api.md](file:///home/idebian/mydrive/Projects/WebstormProjects/easy_com_backend/docs/frontend_api.md)).
