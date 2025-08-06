FROM node:22-bookworm-slim

WORKDIR /app

COPY mcp-server/package*.json ./mcp-server/
COPY shared/db/package*.json ./shared/db/

RUN npm clean-install --prefix shared/db
COPY shared/db ./shared/db
RUN npm run build --prefix shared/db

RUN npm clean-install --prefix mcp-server
COPY mcp-server ./mcp-server
RUN npm run build --prefix mcp-server

# Set environment variable for database path
ENV MCP_KANBAN_DB_FOLDER_PATH=/mcp

# Create volume for database
VOLUME /mcp

# Set entrypoint
ENTRYPOINT ["node", "mcp-server/dist/server.js"]
