import {
  getTodayPrayers,
  getPrayers,
  logPrayer,
  getPrayerSummary,
  getQadaPrayers,
  completeQadaPrayer,
  getQuranLogs,
  logQuranRecitation,
  getQuranSummary,
  getDhikrLogs,
  logDhikr,
  getFastingRecords,
  logFasting,
  getJumuahChecklist,
  saveJumuahChecklist,
  getDuas,
  addDua,
  markDuaAnswered,
  getReflection,
  saveReflection,
  getIslamicDashboard,
  getIslamicSettings,
  saveIslamicSettings
} from '../islamicService';

// Mock the api module
jest.mock('../api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn()
}));

// Import the mocked api after mocking
import api from '../api';

describe('islamicService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Prayer endpoints', () => {
    test('getTodayPrayers calls correct endpoint', async () => {
      api.get.mockResolvedValue({ data: [] });
      await getTodayPrayers();
      expect(api.get).toHaveBeenCalledWith('/api/islamic/prayers/today');
    });

    test('getPrayers calls with date range params', async () => {
      api.get.mockResolvedValue({ data: [] });
      await getPrayers('2024-01-01', '2024-01-31');
      expect(api.get).toHaveBeenCalledWith('/api/islamic/prayers', {
        params: { startDate: '2024-01-01', endDate: '2024-01-31' }
      });
    });

    test('logPrayer posts prayer data', async () => {
      const prayerData = { date: '2024-01-15', prayerType: 'fajr', status: 'prayed' };
      api.post.mockResolvedValue({ data: { message: 'Prayer logged' } });
      await logPrayer(prayerData);
      expect(api.post).toHaveBeenCalledWith('/api/islamic/prayers/log', prayerData);
    });

    test('getPrayerSummary calls with optional params', async () => {
      api.get.mockResolvedValue({ data: {} });
      await getPrayerSummary('2024-01-01', '2024-01-31');
      expect(api.get).toHaveBeenCalledWith('/api/islamic/prayers/summary', {
        params: { startDate: '2024-01-01', endDate: '2024-01-31' }
      });
    });
  });

  describe('Qada endpoints', () => {
    test('getQadaPrayers calls correct endpoint', async () => {
      api.get.mockResolvedValue({ data: [] });
      await getQadaPrayers();
      expect(api.get).toHaveBeenCalledWith('/api/islamic/qada');
    });

    test('completeQadaPrayer posts to correct endpoint', async () => {
      api.post.mockResolvedValue({ data: { message: 'Completed' } });
      await completeQadaPrayer(1);
      expect(api.post).toHaveBeenCalledWith('/api/islamic/qada/1/complete');
    });
  });

  describe('Quran endpoints', () => {
    test('getQuranLogs calls with date params', async () => {
      api.get.mockResolvedValue({ data: [] });
      await getQuranLogs('2024-01-01', '2024-01-31');
      expect(api.get).toHaveBeenCalledWith('/api/islamic/quran', {
        params: { startDate: '2024-01-01', endDate: '2024-01-31' }
      });
    });

    test('logQuranRecitation posts recitation data', async () => {
      const recitationData = { date: '2024-01-15', pages: 5 };
      api.post.mockResolvedValue({ data: { id: 1 } });
      await logQuranRecitation(recitationData);
      expect(api.post).toHaveBeenCalledWith('/api/islamic/quran', recitationData);
    });

    test('getQuranSummary calls correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });
      await getQuranSummary();
      expect(api.get).toHaveBeenCalledWith('/api/islamic/quran/summary');
    });
  });

  describe('Dhikr endpoints', () => {
    test('getDhikrLogs calls with date param', async () => {
      api.get.mockResolvedValue({ data: [] });
      await getDhikrLogs('2024-01-15');
      expect(api.get).toHaveBeenCalledWith('/api/islamic/dhikr', {
        params: { date: '2024-01-15' }
      });
    });

    test('logDhikr posts dhikr data', async () => {
      const dhikrData = { date: '2024-01-15', dhikrType: 'morning_adhkar', count: 1 };
      api.post.mockResolvedValue({ data: { message: 'Logged' } });
      await logDhikr(dhikrData);
      expect(api.post).toHaveBeenCalledWith('/api/islamic/dhikr/log', dhikrData);
    });
  });

  describe('Fasting endpoints', () => {
    test('getFastingRecords calls with date params', async () => {
      api.get.mockResolvedValue({ data: [] });
      await getFastingRecords('2024-01-01', '2024-01-31');
      expect(api.get).toHaveBeenCalledWith('/api/islamic/fasting', {
        params: { startDate: '2024-01-01', endDate: '2024-01-31' }
      });
    });

    test('logFasting posts fasting data', async () => {
      const fastingData = { date: '2024-01-15', fastType: 'voluntary', status: 'completed' };
      api.post.mockResolvedValue({ data: { message: 'Saved' } });
      await logFasting(fastingData);
      expect(api.post).toHaveBeenCalledWith('/api/islamic/fasting', fastingData);
    });
  });

  describe('Jumuah endpoints', () => {
    test('getJumuahChecklist calls with date param', async () => {
      api.get.mockResolvedValue({ data: {} });
      await getJumuahChecklist('2024-01-12');
      expect(api.get).toHaveBeenCalledWith('/api/islamic/jumuah', {
        params: { date: '2024-01-12' }
      });
    });

    test('saveJumuahChecklist posts checklist data', async () => {
      const checklistData = { date: '2024-01-12', ghusl: true, surahKahf: true };
      api.post.mockResolvedValue({ data: { message: 'Saved' } });
      await saveJumuahChecklist(checklistData);
      expect(api.post).toHaveBeenCalledWith('/api/islamic/jumuah', checklistData);
    });
  });

  describe('Dua endpoints', () => {
    test('getDuas calls with optional filters', async () => {
      api.get.mockResolvedValue({ data: [] });
      await getDuas({ category: 'personal' });
      expect(api.get).toHaveBeenCalledWith('/api/islamic/dua', {
        params: { category: 'personal' }
      });
    });

    test('addDua posts dua data', async () => {
      const duaData = { title: 'Test Dua', category: 'personal' };
      api.post.mockResolvedValue({ data: { id: 1 } });
      await addDua(duaData);
      expect(api.post).toHaveBeenCalledWith('/api/islamic/dua', duaData);
    });

    test('markDuaAnswered patches correct endpoint', async () => {
      api.patch.mockResolvedValue({ data: { message: 'Updated' } });
      await markDuaAnswered(1);
      expect(api.patch).toHaveBeenCalledWith('/api/islamic/dua/1/answered');
    });
  });

  describe('Reflection endpoints', () => {
    test('getReflection calls with date param', async () => {
      api.get.mockResolvedValue({ data: {} });
      await getReflection('2024-01-15');
      expect(api.get).toHaveBeenCalledWith('/api/islamic/reflection', {
        params: { date: '2024-01-15' }
      });
    });

    test('saveReflection posts reflection data', async () => {
      const reflectionData = { date: '2024-01-15', gratitude: 'Thank you' };
      api.post.mockResolvedValue({ data: { message: 'Saved' } });
      await saveReflection(reflectionData);
      expect(api.post).toHaveBeenCalledWith('/api/islamic/reflection', reflectionData);
    });
  });

  describe('Dashboard endpoint', () => {
    test('getIslamicDashboard calls correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });
      await getIslamicDashboard();
      expect(api.get).toHaveBeenCalledWith('/api/islamic/dashboard');
    });
  });

  describe('Settings endpoints', () => {
    test('getIslamicSettings calls correct endpoint', async () => {
      api.get.mockResolvedValue({ data: {} });
      await getIslamicSettings();
      expect(api.get).toHaveBeenCalledWith('/api/islamic/settings');
    });

    test('saveIslamicSettings posts settings data', async () => {
      const settingsData = { calculationMethod: 'ISNA', reminderMinutes: 10 };
      api.post.mockResolvedValue({ data: { message: 'Saved' } });
      await saveIslamicSettings(settingsData);
      expect(api.post).toHaveBeenCalledWith('/api/islamic/settings', settingsData);
    });
  });
});
