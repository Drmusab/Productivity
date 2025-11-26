import type {
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { kanbanApiRequest } from './GenericFunctions';

export class KanbanAppTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Kanban App Trigger',
		name: 'kanbanAppTrigger',
		icon: 'file:kanbanApp.svg',
		group: ['trigger'],
		version: 1,
		description: 'Triggers on Kanban app events',
		defaults: {
			name: 'Kanban App Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'kanbanAppApi',
				required: true,
			},
		],
		polling: true,
		properties: [
			{
				displayName: 'Event Types',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Task Created',
						value: 'task.created',
					},
					{
						name: 'Task Updated',
						value: 'task.updated',
					},
					{
						name: 'Task Deleted',
						value: 'task.deleted',
					},
					{
						name: 'Task Completed',
						value: 'task.completed',
					},
					{
						name: 'Board Created',
						value: 'board.created',
					},
					{
						name: 'Board Updated',
						value: 'board.updated',
					},
					{
						name: 'Board Deleted',
						value: 'board.deleted',
					},
				],
				default: ['task.created', 'task.updated'],
				description: 'The events to listen for',
			},
			{
				displayName: 'Polling Interval',
				name: 'pollInterval',
				type: 'number',
				default: 30,
				description: 'How often to check for new events (in seconds)',
				typeOptions: {
					minValue: 5,
					maxValue: 3600,
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Board ID',
						name: 'boardId',
						type: 'number',
						default: '',
						description: 'Only trigger for events on this specific board',
					},
					{
						displayName: 'Priority Filter',
						name: 'priority',
						type: 'options',
						options: [
							{
								name: 'All',
								value: '',
							},
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
						default: '',
						description: 'Only trigger for tasks with this priority',
					},
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const webhookData = this.getWorkflowStaticData('node');
		const events = this.getNodeParameter('events') as string[];
		const options = this.getNodeParameter('options') as any;
		
		let lastTimestamp = webhookData.lastTimestamp as string;
		const now = new Date().toISOString();
		
		if (!lastTimestamp) {
			// First time polling - only get events from the last 10 minutes
			const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
			lastTimestamp = tenMinutesAgo.toISOString();
		}

		const qs: any = {
			since: lastTimestamp,
			events: events.join(','),
		};

		if (options.boardId) {
			qs.board_id = options.boardId;
		}
		if (options.priority) {
			qs.priority = options.priority;
		}

		try {
			const responseData = await kanbanApiRequest.call(this, 'GET', '/events', {}, qs);
			
			webhookData.lastTimestamp = now;

			if (!responseData || !Array.isArray(responseData) || responseData.length === 0) {
				return null;
			}

			const returnData: INodeExecutionData[][] = [];

			for (const event of responseData) {
				returnData.push([
					{
						json: {
							event_id: event.id,
							event_type: event.type,
							timestamp: event.timestamp,
							resource: event.resource,
							resource_id: event.resource_id,
							changes: event.changes || {},
							user_id: event.user_id,
							board_id: event.board_id,
							...event.data,
						},
					},
				]);
			}

			return returnData;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new NodeOperationError(this.getNode(), `Failed to poll for events: ${errorMessage}`);
		}
	}
}
