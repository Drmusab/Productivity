import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	ILoadOptionsFunctions,
	INodePropertyOptions,
} from 'n8n-workflow';

import { kanbanApiRequest, kanbanApiRequestAllItems } from './GenericFunctions';

export class KanbanApp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kanban App',
		name: 'kanbanApp',
                icon: 'file:kanbanApp.svg',
		group: ['productivity'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Kanban Task Management Application',
		defaults: {
			name: 'Kanban App',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'kanbanAppApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Board',
						value: 'board',
					},
					{
						name: 'Task',
						value: 'task',
					},
					{
						name: 'Column',
						value: 'column',
					},
					{
						name: 'Report',
						value: 'report',
					},
				],
				default: 'task',
			},

			// Task Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['task'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new task',
						action: 'Create a task',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a task',
						action: 'Delete a task',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a task',
						action: 'Get a task',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many tasks',
						action: 'Get many tasks',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a task',
						action: 'Update a task',
					},
				],
				default: 'create',
			},

			// Board Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['board'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new board',
						action: 'Create a board',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a board',
						action: 'Delete a board',
					},
					{
						name: 'Get',
						value: 'get',
						description: 'Get a board',
						action: 'Get a board',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get many boards',
						action: 'Get many boards',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a board',
						action: 'Update a board',
					},
				],
				default: 'create',
			},

			// Column Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['column'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a new column',
						action: 'Create a column',
					},
					{
						name: 'Get Many',
						value: 'getAll',
						description: 'Get columns for a board',
						action: 'Get many columns',
					},
					{
						name: 'Update',
						value: 'update',
						description: 'Update a column',
						action: 'Update a column',
					},
				],
				default: 'create',
			},

			// Report Operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['report'],
					},
				},
				options: [
					{
						name: 'Get Weekly Report',
						value: 'weekly',
						description: 'Get weekly analytics report',
						action: 'Get weekly report',
					},
					{
						name: 'Get Custom Report',
						value: 'custom',
						description: 'Get custom date range report',
						action: 'Get custom report',
					},
				],
				default: 'weekly',
			},

			// Task ID field for get, update, delete operations
			{
				displayName: 'Task ID',
				name: 'taskId',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['get', 'update', 'delete'],
					},
				},
				default: '',
				required: true,
				description: 'ID of the task',
			},

			// Board ID field for various operations
			{
				displayName: 'Board ID',
				name: 'boardId',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['board'],
						operation: ['get', 'update', 'delete'],
					},
				},
				default: '',
				required: true,
				description: 'ID of the board',
			},

                        {
                                displayName: 'Board ID',
                                name: 'boardId',
                                type: 'number',
                                displayOptions: {
                                        show: {
                                                resource: ['column'],
                                                operation: ['create', 'getAll', 'update'],
                                        },
                                },
                                default: '',
                                required: true,
                                description: 'ID of the board',
                        },

                        {
                                displayName: 'Column ID',
                                name: 'columnId',
                                type: 'number',
                                displayOptions: {
                                        show: {
                                                resource: ['column'],
                                                operation: ['update'],
                                        },
                                },
                                default: '',
                                required: true,
                                description: 'ID of the column to update',
                        },

			// Task creation fields
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['create'],
					},
				},
				default: '',
				required: true,
				description: 'Title of the task',
			},

			{
				displayName: 'Column ID',
				name: 'columnId',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['create'],
					},
				},
				default: '',
				required: true,
				description: 'ID of the column where the task will be created',
			},

			// Board creation fields
			{
				displayName: 'Board Name',
				name: 'boardName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['board'],
						operation: ['create'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the board',
			},

			// Column creation fields
			{
				displayName: 'Column Name',
				name: 'columnName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['column'],
						operation: ['create'],
					},
				},
				default: '',
				required: true,
				description: 'Name of the column',
			},

			// Additional fields for tasks
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['task'],
						operation: ['create', 'update'],
					},
				},
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'Description of the task (supports Markdown)',
					},
					{
						displayName: 'Priority',
						name: 'priority',
						type: 'options',
						options: [
							{
								name: 'Low',
								value: 'low',
							},
							{
								name: 'Medium',
								value: 'medium',
							},
							{
								name: 'High',
								value: 'high',
							},
							{
								name: 'Critical',
								value: 'critical',
							},
						],
						default: 'medium',
					},
					{
						displayName: 'Due Date',
						name: 'dueDate',
						type: 'dateTime',
						default: '',
						description: 'Due date for the task',
					},
					{
						displayName: 'Status',
						name: 'status',
						type: 'options',
						options: [
							{
								name: 'To Do',
								value: 'todo',
							},
							{
								name: 'In Progress',
								value: 'in_progress',
							},
							{
								name: 'Done',
								value: 'done',
							},
						],
						default: 'todo',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						description: 'Comma-separated list of tags',
					},
					{
						displayName: 'Assigned To (User ID)',
						name: 'assignedTo',
						type: 'number',
						default: '',
						description: 'ID of the user assigned to this task',
					},
				],
			},

			// Additional fields for boards
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['board'],
						operation: ['create', 'update'],
					},
				},
                                options: [
                                        {
                                                displayName: 'Description',
                                                name: 'description',
                                                type: 'string',
                                                default: '',
                                                description: 'Description of the board',
                                        },
                                        {
                                                displayName: 'Name',
                                                name: 'name',
                                                type: 'string',
                                                default: '',
                                                description: 'New name of the board',
                                        },
                                        {
                                                displayName: 'Template',
                                                name: 'template',
                                                type: 'options',
                                                options: [
							{
								name: 'Simple',
								value: 'simple',
							},
							{
								name: 'Software Development',
								value: 'software',
							},
							{
								name: 'Bug Tracking',
								value: 'bug_tracking',
							},
							{
								name: 'Custom',
								value: 'custom',
							},
						],
						default: 'simple',
						description: 'Board template to use',
					},
				],
			},

			// Additional fields for columns
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						resource: ['column'],
						operation: ['create', 'update'],
					},
				},
				options: [
					{
						displayName: 'Color',
						name: 'color',
						type: 'color',
						default: '#2196F3',
						description: 'Color for the column',
					},
					{
						displayName: 'WIP Limit',
						name: 'wipLimit',
						type: 'number',
						default: '',
						description: 'Work-in-progress limit for this column',
					},
					{
						displayName: 'Position',
						name: 'position',
						type: 'number',
						default: '',
						description: 'Position of the column',
					},
				],
			},

			// Report date range fields
			{
				displayName: 'Start Date',
				name: 'startDate',
				type: 'dateTime',
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['custom'],
					},
				},
				default: '',
				required: true,
				description: 'Start date for the report',
			},

			{
				displayName: 'End Date',
				name: 'endDate',
				type: 'dateTime',
				displayOptions: {
					show: {
						resource: ['report'],
						operation: ['custom'],
					},
				},
				default: '',
				required: true,
				description: 'End date for the report',
			},

			// Options for pagination
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				displayOptions: {
					show: {
						resource: ['task', 'board'],
						operation: ['getAll'],
					},
				},
				options: [
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'number',
						typeOptions: {
							minValue: 1,
						},
						default: 50,
						description: 'Max number of results to return',
					},
					{
						displayName: 'Return All',
						name: 'returnAll',
						type: 'boolean',
						default: false,
						description: 'Whether to return all results or only up to the given limit',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: any = {};
		let responseData;

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			try {
				if (resource === 'task') {
					if (operation === 'create') {
						const title = this.getNodeParameter('title', i) as string;
						const columnId = this.getNodeParameter('columnId', i) as number;
						const additionalFields = this.getNodeParameter('additionalFields', i) as any;

						const body: any = {
							title,
							column_id: columnId,
						};

						if (additionalFields.description) {
							body.description = additionalFields.description;
						}
						if (additionalFields.priority) {
							body.priority = additionalFields.priority;
						}
						if (additionalFields.dueDate) {
							body.due_date = additionalFields.dueDate;
						}
						if (additionalFields.status) {
							body.status = additionalFields.status;
						}
						if (additionalFields.tags) {
							body.tags = additionalFields.tags.split(',').map((tag: string) => tag.trim());
						}
						if (additionalFields.assignedTo) {
							body.assigned_to = additionalFields.assignedTo;
						}

						responseData = await kanbanApiRequest.call(this, 'POST', '/tasks', body);
					}

					if (operation === 'delete') {
						const taskId = this.getNodeParameter('taskId', i) as number;
						responseData = await kanbanApiRequest.call(this, 'DELETE', `/tasks/${taskId}`);
					}

					if (operation === 'get') {
						const taskId = this.getNodeParameter('taskId', i) as number;
						responseData = await kanbanApiRequest.call(this, 'GET', `/tasks/${taskId}`);
					}

					if (operation === 'getAll') {
						const options = this.getNodeParameter('options', i) as any;
						
						if (options.returnAll) {
							responseData = await kanbanApiRequestAllItems.call(this, 'GET', '/tasks', {}, qs);
						} else {
							qs.limit = options.limit || 50;
							responseData = await kanbanApiRequest.call(this, 'GET', '/tasks', {}, qs);
						}
					}

					if (operation === 'update') {
						const taskId = this.getNodeParameter('taskId', i) as number;
						const additionalFields = this.getNodeParameter('additionalFields', i) as any;

						const body: any = {};

						if (additionalFields.title) {
							body.title = additionalFields.title;
						}
						if (additionalFields.description) {
							body.description = additionalFields.description;
						}
						if (additionalFields.priority) {
							body.priority = additionalFields.priority;
						}
						if (additionalFields.dueDate) {
							body.due_date = additionalFields.dueDate;
						}
						if (additionalFields.status) {
							body.status = additionalFields.status;
						}
						if (additionalFields.tags) {
							body.tags = additionalFields.tags.split(',').map((tag: string) => tag.trim());
						}
						if (additionalFields.assignedTo) {
							body.assigned_to = additionalFields.assignedTo;
						}

						responseData = await kanbanApiRequest.call(this, 'PUT', `/tasks/${taskId}`, body);
					}
				}

				if (resource === 'board') {
					if (operation === 'create') {
						const boardName = this.getNodeParameter('boardName', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as any;

						const body: any = {
							name: boardName,
						};

						if (additionalFields.description) {
							body.description = additionalFields.description;
						}
						if (additionalFields.template) {
							body.template = additionalFields.template;
						}

						responseData = await kanbanApiRequest.call(this, 'POST', '/boards', body);
					}

					if (operation === 'delete') {
						const boardId = this.getNodeParameter('boardId', i) as number;
						responseData = await kanbanApiRequest.call(this, 'DELETE', `/boards/${boardId}`);
					}

					if (operation === 'get') {
						const boardId = this.getNodeParameter('boardId', i) as number;
						responseData = await kanbanApiRequest.call(this, 'GET', `/boards/${boardId}`);
					}

					if (operation === 'getAll') {
						const options = this.getNodeParameter('options', i) as any;
						
						if (options.returnAll) {
							responseData = await kanbanApiRequestAllItems.call(this, 'GET', '/boards', {}, qs);
						} else {
							qs.limit = options.limit || 50;
							responseData = await kanbanApiRequest.call(this, 'GET', '/boards', {}, qs);
						}
					}

					if (operation === 'update') {
						const boardId = this.getNodeParameter('boardId', i) as number;
						const additionalFields = this.getNodeParameter('additionalFields', i) as any;

						const body: any = {};

                                                if (additionalFields.name) {
                                                        body.name = additionalFields.name;
                                                }
                                                if (additionalFields.description) {
                                                        body.description = additionalFields.description;
                                                }
                                                if (additionalFields.template) {
                                                        body.template = additionalFields.template;
                                                }

                                                responseData = await kanbanApiRequest.call(this, 'PUT', `/boards/${boardId}`, body);
                                        }
                                }

				if (resource === 'column') {
					if (operation === 'create') {
						const boardId = this.getNodeParameter('boardId', i) as number;
						const columnName = this.getNodeParameter('columnName', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i) as any;

						const body: any = {
							name: columnName,
							board_id: boardId,
						};

						if (additionalFields.color) {
							body.color = additionalFields.color;
						}
						if (additionalFields.wipLimit) {
							body.wip_limit = additionalFields.wipLimit;
						}
						if (additionalFields.position !== undefined) {
							body.position = additionalFields.position;
						}

						responseData = await kanbanApiRequest.call(this, 'POST', `/boards/${boardId}/columns`, body);
					}

					if (operation === 'getAll') {
						const boardId = this.getNodeParameter('boardId', i) as number;
						responseData = await kanbanApiRequest.call(this, 'GET', `/boards/${boardId}/columns`);
					}

					if (operation === 'update') {
						const boardId = this.getNodeParameter('boardId', i) as number;
						const columnId = this.getNodeParameter('columnId', i) as number;
						const additionalFields = this.getNodeParameter('additionalFields', i) as any;

						const body: any = {};

						if (additionalFields.name) {
							body.name = additionalFields.name;
						}
						if (additionalFields.color) {
							body.color = additionalFields.color;
						}
						if (additionalFields.wipLimit) {
							body.wip_limit = additionalFields.wipLimit;
						}
						if (additionalFields.position !== undefined) {
							body.position = additionalFields.position;
						}

						responseData = await kanbanApiRequest.call(this, 'PUT', `/boards/${boardId}/columns/${columnId}`, body);
					}
				}

				if (resource === 'report') {
					if (operation === 'weekly') {
						responseData = await kanbanApiRequest.call(this, 'GET', '/reports/weekly');
					}

					if (operation === 'custom') {
						const startDate = this.getNodeParameter('startDate', i) as string;
						const endDate = this.getNodeParameter('endDate', i) as string;

						qs.start = startDate;
						qs.end = endDate;

						responseData = await kanbanApiRequest.call(this, 'GET', '/reports/custom', {}, qs);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as any),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return returnData;
	}
}
