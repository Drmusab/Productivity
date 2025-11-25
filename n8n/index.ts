import { KanbanApp } from './nodes/KanbanApp/KanbanApp.node';
import { KanbanAppTrigger } from './nodes/KanbanApp/KanbanAppTrigger.node';
import { KanbanAppApi } from './credentials/KanbanAppApi.credentials';

module.exports = {
	nodes: [KanbanApp, KanbanAppTrigger],
	credentials: [KanbanAppApi],
};
