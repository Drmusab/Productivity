// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AccessTime,
  Add,
  CheckCircle,
  Close,
  EmojiObjects,
  Event,
  Favorite,
  Groups,
  LocalDining,
  MenuBook,
  Mosque,
  NightsStay,
  RadioButtonUnchecked,
  Refresh,
  Schedule,
  Star,
  WbSunny,
  WbTwilight,
} from '@mui/icons-material';
import dayjs from 'dayjs';

import {
  getIslamicDashboard,
  logPrayer,
  logDhikr,
  logQuranRecitation,
  logFasting,
  saveJumuahChecklist,
  getJumuahChecklist,
  getPrayerSummary,
  getQuranSummary,
} from '../services/islamicService';
import { useNotification } from '../contexts/NotificationContext';

// Standard tasbih count target (SubhanAllah, Alhamdulillah, Allahu Akbar - each 33 times after prayer)
const TASBIH_TARGET = 33;

// Prayer icons and labels
const PRAYER_CONFIG = {
  fajr: { label: 'الفجر', labelEn: 'Fajr', icon: <WbTwilight />, color: '#3498db' },
  dhuhr: { label: 'الظهر', labelEn: 'Dhuhr', icon: <WbSunny />, color: '#f39c12' },
  asr: { label: 'العصر', labelEn: 'Asr', icon: <WbSunny sx={{ opacity: 0.7 }} />, color: '#e67e22' },
  maghrib: { label: 'المغرب', labelEn: 'Maghrib', icon: <WbTwilight sx={{ transform: 'rotate(180deg)' }} />, color: '#9b59b6' },
  isha: { label: 'العشاء', labelEn: 'Isha', icon: <NightsStay />, color: '#2c3e50' },
};

// Prayer status icons
const PrayerStatusIcon = ({ status, onClick }) => {
  const iconProps = {
    onClick,
    sx: { cursor: 'pointer', fontSize: 32 },
  };

  switch (status) {
    case 'prayed':
      return (
        <Tooltip title="صليت - اضغط للتغيير">
          <CheckCircle {...iconProps} sx={{ ...iconProps.sx, color: '#2ecc71' }} />
        </Tooltip>
      );
    case 'missed':
      return (
        <Tooltip title="فاتت - اضغط للتغيير">
          <Close {...iconProps} sx={{ ...iconProps.sx, color: '#e74c3c' }} />
        </Tooltip>
      );
    case 'qada':
      return (
        <Tooltip title="قضاء - اضغط للتغيير">
          <Schedule {...iconProps} sx={{ ...iconProps.sx, color: '#f39c12' }} />
        </Tooltip>
      );
    default:
      return (
        <Tooltip title="في الانتظار - اضغط للتسجيل">
          <RadioButtonUnchecked {...iconProps} sx={{ ...iconProps.sx, color: '#bdc3c7' }} />
        </Tooltip>
      );
  }
};

// Dhikr counter component
const DhikrCounter = ({ type, label, count, target, onUpdate }) => {
  const progress = target > 0 ? Math.min((count / target) * 100, 100) : 0;
  const isComplete = count >= target;

  return (
    <Card variant="outlined" sx={{ mb: 1 }}>
      <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              {label}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#ecf0f1',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: isComplete ? '#2ecc71' : '#3498db',
                  },
                }}
              />
              <Typography variant="caption">
                {count}/{target}
              </Typography>
            </Stack>
          </Box>
          <IconButton
            size="small"
            onClick={() => onUpdate(count + 1)}
            disabled={isComplete}
            color="primary"
          >
            <Add />
          </IconButton>
          {isComplete && <CheckCircle color="success" fontSize="small" />}
        </Stack>
      </CardContent>
    </Card>
  );
};

const Islamic = () => {
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [prayerSummary, setPrayerSummary] = useState(null);
  const [quranSummary, setQuranSummary] = useState(null);
  const [jumuahChecklist, setJumuahChecklist] = useState(null);

  // Dialog states
  const [quranDialogOpen, setQuranDialogOpen] = useState(false);
  const [fastingDialogOpen, setFastingDialogOpen] = useState(false);
  const [quranForm, setQuranForm] = useState({ pages: '', durationMinutes: '', notes: '' });
  const [fastingForm, setFastingForm] = useState({ fastType: 'voluntary', status: 'completed', notes: '' });

  const today = dayjs().format('YYYY-MM-DD');

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardRes, prayerSummaryRes, quranSummaryRes] = await Promise.all([
        getIslamicDashboard(),
        getPrayerSummary(),
        getQuranSummary(),
      ]);
      setDashboard(dashboardRes.data);
      setPrayerSummary(prayerSummaryRes.data);
      setQuranSummary(quranSummaryRes.data);

      // Load Jumu'ah checklist if Friday
      if (dashboardRes.data.isFriday) {
        const jumuahRes = await getJumuahChecklist(today);
        setJumuahChecklist(jumuahRes.data);
      }
    } catch (error) {
      showError('فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [showError, today]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Status cycle for prayers
  const statusCycle = ['pending', 'prayed', 'missed', 'qada'];

  const handlePrayerLog = async (prayerType, currentStatus) => {
    const currentIndex = statusCycle.indexOf(currentStatus);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

    try {
      await logPrayer({
        date: today,
        prayerType,
        status: nextStatus,
        onTime: nextStatus === 'prayed',
      });
      loadDashboard();
    } catch (error) {
      showError('فشل في تسجيل الصلاة');
    }
  };

  const handleDhikrUpdate = async (dhikrType, newCount, target = 33) => {
    try {
      await logDhikr({
        date: today,
        dhikrType,
        count: newCount,
        target,
        completed: newCount >= target,
      });
      loadDashboard();
    } catch (error) {
      showError('فشل في تسجيل الذكر');
    }
  };

  const handleQuranLog = async () => {
    try {
      await logQuranRecitation({
        date: today,
        recitationType: 'tilawah',
        pages: parseFloat(quranForm.pages) || 0,
        durationMinutes: parseInt(quranForm.durationMinutes) || 0,
        notes: quranForm.notes,
      });
      showSuccess('تم تسجيل تلاوة القرآن');
      setQuranDialogOpen(false);
      setQuranForm({ pages: '', durationMinutes: '', notes: '' });
      loadDashboard();
    } catch (error) {
      showError('فشل في تسجيل القراءة');
    }
  };

  const handleFastingLog = async () => {
    try {
      await logFasting({
        date: today,
        fastType: fastingForm.fastType,
        status: fastingForm.status,
        notes: fastingForm.notes,
      });
      showSuccess('تم تسجيل الصيام');
      setFastingDialogOpen(false);
      setFastingForm({ fastType: 'voluntary', status: 'completed', notes: '' });
      loadDashboard();
    } catch (error) {
      showError('فشل في تسجيل الصيام');
    }
  };

  const handleJumuahChecklistChange = async (field, value) => {
    try {
      const updatedChecklist = { ...jumuahChecklist, [field]: value, date: today };
      await saveJumuahChecklist(updatedChecklist);
      setJumuahChecklist(updatedChecklist);
    } catch (error) {
      showError('فشل في حفظ قائمة الجمعة');
    }
  };

  // Render Prayer Tracker section
  const renderPrayerTracker = () => {
    if (!dashboard) return null;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              <Mosque sx={{ mr: 1, verticalAlign: 'middle' }} />
              صلوات اليوم
            </Typography>
            <Chip
              label={`${dashboard.prayerCompletion}%`}
              color={dashboard.prayerCompletion === 100 ? 'success' : dashboard.prayerCompletion >= 60 ? 'warning' : 'error'}
              size="small"
            />
          </Stack>

          <Grid container spacing={2}>
            {Object.entries(PRAYER_CONFIG).map(([type, config]) => {
              const prayer = dashboard.prayers[type];
              return (
                <Grid item xs={12} sm={6} md={2.4} key={type}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      borderColor: prayer?.status === 'prayed' ? '#2ecc71' : 'divider',
                      backgroundColor: prayer?.status === 'prayed' ? 'rgba(46, 204, 113, 0.05)' : 'inherit',
                    }}
                  >
                    <Box sx={{ color: config.color, mb: 1 }}>{config.icon}</Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {config.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      {config.labelEn}
                    </Typography>
                    <Box sx={{ my: 1 }}>
                      <PrayerStatusIcon
                        status={prayer?.status || 'pending'}
                        onClick={() => handlePrayerLog(type, prayer?.status || 'pending')}
                      />
                    </Box>
                    <Stack direction="row" justifyContent="center" spacing={0.5}>
                      <Tooltip title="مع الجماعة">
                        <Chip
                          icon={<Groups fontSize="small" />}
                          size="small"
                          variant={prayer?.withJamaah ? 'filled' : 'outlined'}
                          color={prayer?.withJamaah ? 'primary' : 'default'}
                          sx={{ cursor: 'pointer' }}
                        />
                      </Tooltip>
                      <Tooltip title="في الوقت">
                        <Chip
                          icon={<AccessTime fontSize="small" />}
                          size="small"
                          variant={prayer?.onTime ? 'filled' : 'outlined'}
                          color={prayer?.onTime ? 'success' : 'default'}
                          sx={{ cursor: 'pointer' }}
                        />
                      </Tooltip>
                    </Stack>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          {dashboard.qadaPending > 0 && (
            <Paper sx={{ mt: 2, p: 2, backgroundColor: '#fff3cd' }}>
              <Typography variant="body2" color="text.secondary">
                <Schedule sx={{ mr: 1, verticalAlign: 'middle', fontSize: 18 }} />
                لديك {dashboard.qadaPending} صلاة قضاء في الانتظار
              </Typography>
            </Paper>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render Quran section
  const renderQuranSection = () => {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              <MenuBook sx={{ mr: 1, verticalAlign: 'middle' }} />
              القرآن الكريم
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              onClick={() => setQuranDialogOpen(true)}
            >
              تسجيل تلاوة
            </Button>
          </Stack>

          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {dashboard?.quran?.pagesRead || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  صفحات اليوم
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="secondary">
                  {dashboard?.quran?.minutesSpent || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  دقائق اليوم
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {quranSummary?.totalPages || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  صفحات الشهر
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4">
                  {quranSummary?.sessions || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  جلسات الشهر
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // Render Dhikr section
  const renderDhikrSection = () => {
    const dhikrItems = [
      { type: 'morning_adhkar', label: 'أذكار الصباح', target: 1 },
      { type: 'evening_adhkar', label: 'أذكار المساء', target: 1 },
      { type: 'subhanallah', label: 'سبحان الله', target: TASBIH_TARGET },
      { type: 'alhamdulillah', label: 'الحمد لله', target: TASBIH_TARGET },
      { type: 'allahuakbar', label: 'الله أكبر', target: TASBIH_TARGET },
    ];

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            <Favorite sx={{ mr: 1, verticalAlign: 'middle' }} />
            الأذكار والتسبيح
          </Typography>

          {dhikrItems.map((item) => {
            const dhikr = dashboard?.dhikr?.find((d) => d.type === item.type);
            return (
              <DhikrCounter
                key={item.type}
                type={item.type}
                label={item.label}
                count={dhikr?.count || 0}
                target={item.target}
                onUpdate={(count) => handleDhikrUpdate(item.type, count, item.target)}
              />
            );
          })}
        </CardContent>
      </Card>
    );
  };

  // Render Fasting section
  const renderFastingSection = () => {
    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6">
              <LocalDining sx={{ mr: 1, verticalAlign: 'middle' }} />
              الصيام
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Add />}
              onClick={() => setFastingDialogOpen(true)}
            >
              تسجيل صيام
            </Button>
          </Stack>

          {dashboard?.fasting ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <CheckCircle color="success" />
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    صائم اليوم
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dashboard.fasting.type === 'monday_thursday' && 'صيام الاثنين والخميس'}
                    {dashboard.fasting.type === 'voluntary' && 'صيام تطوع'}
                    {dashboard.fasting.type === 'white_days' && 'أيام البيض'}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          ) : (
            <Typography variant="body2" color="text.secondary">
              لم يتم تسجيل صيام اليوم
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render Jumu'ah Checklist
  const renderJumuahChecklist = () => {
    if (!dashboard?.isFriday) return null;

    const checklistItems = [
      { field: 'ghusl', label: 'الغسل' },
      { field: 'earlyArrival', label: 'الذهاب مبكراً' },
      { field: 'sunnahPrayers', label: 'صلاة السنن' },
      { field: 'surahKahf', label: 'قراءة سورة الكهف' },
      { field: 'extraDua', label: 'الإكثار من الدعاء' },
      { field: 'specialAdhkar', label: 'الصلاة على النبي ﷺ' },
    ];

    return (
      <Card sx={{ mb: 3, border: '2px solid', borderColor: 'success.main' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            <Star sx={{ mr: 1, verticalAlign: 'middle', color: 'success.main' }} />
            قائمة يوم الجمعة
          </Typography>

          <List dense>
            {checklistItems.map((item) => (
              <ListItem key={item.field} disablePadding>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={jumuahChecklist?.[item.field] || false}
                      onChange={(e) => handleJumuahChecklistChange(item.field, e.target.checked)}
                      color="success"
                    />
                  }
                  label={item.label}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  };

  // Render Prayer Statistics
  const renderPrayerStats = () => {
    if (!prayerSummary) return null;

    const completionRate = prayerSummary.total > 0
      ? Math.round((prayerSummary.prayed / prayerSummary.total) * 100)
      : 0;

    return (
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            <EmojiObjects sx={{ mr: 1, verticalAlign: 'middle' }} />
            إحصائيات الصلاة (الشهر الحالي)
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {completionRate}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  نسبة الإنجاز
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {prayerSummary.prayed}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  صلوات مؤداة
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="info.main">
                  {prayerSummary.withJamaah}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  مع الجماعة
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main">
                  {prayerSummary.onTime}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  في الوقت
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">الفلاح</Typography>
          <Typography color="text.secondary">
            متابعة العبادات اليومية
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip
            icon={<Event />}
            label={dayjs().format('dddd, D MMMM YYYY')}
            variant="outlined"
          />
          <IconButton onClick={loadDashboard}>
            <Refresh />
          </IconButton>
        </Stack>
      </Stack>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="لوحة التحكم" />
          <Tab label="الإحصائيات" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {renderPrayerTracker()}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderQuranSection()}
            {renderFastingSection()}
          </Grid>
          <Grid item xs={12} md={6}>
            {renderDhikrSection()}
            {renderJumuahChecklist()}
          </Grid>
        </Grid>
      )}

      {activeTab === 1 && (
        <>
          {renderPrayerStats()}
        </>
      )}

      {/* Quran Log Dialog */}
      <Dialog open={quranDialogOpen} onClose={() => setQuranDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تسجيل تلاوة القرآن</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="عدد الصفحات"
              type="number"
              value={quranForm.pages}
              onChange={(e) => setQuranForm({ ...quranForm, pages: e.target.value })}
              fullWidth
            />
            <TextField
              label="المدة (بالدقائق)"
              type="number"
              value={quranForm.durationMinutes}
              onChange={(e) => setQuranForm({ ...quranForm, durationMinutes: e.target.value })}
              fullWidth
            />
            <TextField
              label="ملاحظات"
              multiline
              rows={2}
              value={quranForm.notes}
              onChange={(e) => setQuranForm({ ...quranForm, notes: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuranDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleQuranLog} variant="contained">حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* Fasting Log Dialog */}
      <Dialog open={fastingDialogOpen} onClose={() => setFastingDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تسجيل صيام</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="نوع الصيام"
              value={fastingForm.fastType}
              onChange={(e) => setFastingForm({ ...fastingForm, fastType: e.target.value })}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="voluntary">تطوع</option>
              <option value="monday_thursday">الاثنين والخميس</option>
              <option value="white_days">أيام البيض</option>
              <option value="arafah">يوم عرفة</option>
              <option value="ashura">يوم عاشوراء</option>
              <option value="shawwal">ستة من شوال</option>
            </TextField>
            <TextField
              select
              label="الحالة"
              value={fastingForm.status}
              onChange={(e) => setFastingForm({ ...fastingForm, status: e.target.value })}
              fullWidth
              SelectProps={{ native: true }}
            >
              <option value="planned">مخطط</option>
              <option value="completed">مكتمل</option>
              <option value="broken">أفطرت</option>
            </TextField>
            <TextField
              label="ملاحظات"
              multiline
              rows={2}
              value={fastingForm.notes}
              onChange={(e) => setFastingForm({ ...fastingForm, notes: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFastingDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleFastingLog} variant="contained">حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Islamic;
