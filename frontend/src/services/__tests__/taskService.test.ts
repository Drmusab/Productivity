import {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addSubtask,
  updateSubtask,
  deleteSubtask,
  addTagsToTask,
  removeTagsFromTask
} from '../taskService';

// Mock the api module
jest.mock('../api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

// Import the mocked api after mocking
import api from '../api';

describe('taskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTasks', () => {
    test('calls API with correct endpoint and params', async () => {
      const params = { boardId: 1 };
      api.get.mockResolvedValue({ data: [] });

      await getTasks(params);

      expect(api.get).toHaveBeenCalledWith('/api/tasks', { params });
    });

    test('returns task data', async () => {
      const mockTasks = [{ id: 1, title: 'Test Task' }];
      api.get.mockResolvedValue({ data: mockTasks });

      const result = await getTasks();

      expect(result.data).toEqual(mockTasks);
    });
  });

  describe('getTask', () => {
    test('calls API with correct task ID', async () => {
      api.get.mockResolvedValue({ data: { id: 1 } });

      await getTask(1);

      expect(api.get).toHaveBeenCalledWith('/api/tasks/1');
    });
  });

  describe('createTask', () => {
    test('calls API with task data', async () => {
      const taskData = { title: 'New Task', column_id: 1 };
      api.post.mockResolvedValue({ data: { id: 1, ...taskData } });

      await createTask(taskData);

      expect(api.post).toHaveBeenCalledWith('/api/tasks', taskData);
    });
  });

  describe('updateTask', () => {
    test('calls API with task ID and updated data', async () => {
      const updatedData = { title: 'Updated Task' };
      api.put.mockResolvedValue({ data: { id: 1, ...updatedData } });

      await updateTask(1, updatedData);

      expect(api.put).toHaveBeenCalledWith('/api/tasks/1', updatedData);
    });
  });

  describe('deleteTask', () => {
    test('calls API with task ID and deleted_by', async () => {
      api.delete.mockResolvedValue({ data: { success: true } });

      await deleteTask(1, 'user123');

      expect(api.delete).toHaveBeenCalledWith('/api/tasks/1', {
        data: { deleted_by: 'user123' }
      });
    });
  });

  describe('addSubtask', () => {
    test('calls API with task ID and subtask data', async () => {
      const subtaskData = { title: 'Subtask 1' };
      api.post.mockResolvedValue({ data: { id: 1, ...subtaskData } });

      await addSubtask(1, subtaskData);

      expect(api.post).toHaveBeenCalledWith('/api/tasks/1/subtasks', subtaskData);
    });
  });

  describe('updateSubtask', () => {
    test('calls API with task ID, subtask ID and updated data', async () => {
      const updatedData = { title: 'Updated Subtask', completed: true };
      api.put.mockResolvedValue({ data: updatedData });

      await updateSubtask(1, 2, updatedData);

      expect(api.put).toHaveBeenCalledWith('/api/tasks/1/subtasks/2', updatedData);
    });
  });

  describe('deleteSubtask', () => {
    test('calls API with task ID and subtask ID', async () => {
      api.delete.mockResolvedValue({ data: { success: true } });

      await deleteSubtask(1, 2);

      expect(api.delete).toHaveBeenCalledWith('/api/tasks/1/subtasks/2');
    });
  });

  describe('addTagsToTask', () => {
    test('calls API with task ID and tag IDs', async () => {
      const tagIds = [1, 2, 3];
      api.post.mockResolvedValue({ data: { success: true } });

      await addTagsToTask(1, tagIds);

      expect(api.post).toHaveBeenCalledWith('/api/tasks/1/tags', { tagIds });
    });
  });

  describe('removeTagsFromTask', () => {
    test('calls API with task ID and tag IDs to remove', async () => {
      const tagIds = [1, 2];
      api.delete.mockResolvedValue({ data: { success: true } });

      await removeTagsFromTask(1, tagIds);

      expect(api.delete).toHaveBeenCalledWith('/api/tasks/1/tags', {
        data: { tagIds }
      });
    });
  });
});
