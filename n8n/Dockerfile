# Build the KanbanApp custom nodes for n8n
# Use a simpler approach: copy pre-built dist folder
FROM n8nio/n8n:1.63.1

USER root

# Create the custom node directory structure
RUN mkdir -p /custom/n8n-nodes-kanban-app/dist

# Copy package.json and the pre-built dist folder
COPY package.json /custom/n8n-nodes-kanban-app/
COPY dist /custom/n8n-nodes-kanban-app/dist

# Install the custom node
RUN mkdir -p /home/node/.n8n/custom \
    && cp -R /custom/n8n-nodes-kanban-app /home/node/.n8n/custom/n8n-nodes-kanban-app \
    && chown -R node:node /home/node/.n8n

ENV N8N_CUSTOM_EXTENSIONS="/home/node/.n8n/custom"

USER node
