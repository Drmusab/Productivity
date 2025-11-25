import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class KanbanAppApi implements ICredentialType {
        name = 'kanbanAppApi';

        displayName = 'Kanban App API';

        documentationUrl = 'https://github.com/Drmusab/Kanban-style-task/tree/main/n8n#configuration';

        properties: INodeProperties[] = [
                {
                        displayName: 'Base URL',
                        name: 'baseUrl',
                        type: 'string',
                        default: 'http://localhost:3001',
                        placeholder: 'http://localhost:3001',
                        description: 'Base URL of your Kanban Task Management API',
                },
                {
                        displayName: 'API Key',
                        name: 'apiKey',
                        type: 'string',
                        typeOptions: {
                                password: true,
                        },
                        default: '',
                        description: 'API key for authenticating requests',
                },
                {
                        displayName: 'Access Token',
                        name: 'accessToken',
                        type: 'string',
                        typeOptions: {
                                password: true,
                        },
                        default: '',
                        description: 'JWT access token for authenticating requests',
                },
        ];
}
