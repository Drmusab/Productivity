// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add,
  CheckCircle,
  Cancel,
  PauseCircle,
  RadioButtonUnchecked,
  Edit,
  Delete,
  Archive,
  MoreVert,
  TrendingUp,
  LocalFireDepartment,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';

dayjs.locale('ar');

import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  archiveHabit,
  logHabit,
  getWeeklySummary,
  getMonthlySummary,
} from '../services/habitService';
import HabitDialog from '../components/HabitDialog';
import { useNotification } from '../contexts/NotificationContext';

// Status icons mapping
const StatusIcon = ({ status, onClick, disabled = false }) => {
  const iconProps = {
    onClick: disabled ? undefined : onClick,
    sx: { cursor: disabled ? 'default' : 'pointer', fontSize: 28 },
  };

  switch (status) {
    case 'done':
      return (
        <Tooltip title="مكتمل - اضغط للتغيير">
          <CheckCircle {...iconProps} sx={{ ...iconProps.sx, color: '#2ecc71' }} />
        </Tooltip>
      );
    case 'missed':
      return (
        <Tooltip title="فاتك - اضغط للتغيير">
          <Cancel {...iconProps} sx={{ ...iconProps.sx, color: '#e74c3c' }} />
        </Tooltip>
      );
    case 'skipped':
      return (
        <Tooltip title="تم التجاوز - اضغط للتغيير">
          <PauseCircle {...iconProps} sx={{ ...iconProps.sx, color: '#f39c12' }} />
        </Tooltip>
      );
    default:
      return (
        <Tooltip title="غير مسجل - اضغط للتحديد">
          <RadioButtonUnchecked {...iconProps} sx={{ ...iconProps.sx, color: '#bdc3c7' }} />
        </Tooltip>
      );
  }
};

// Progress bar with color gradient
const ProgressBar = ({ value, color = '#3498db', height = 10 }) => {
  const getColorByValue = (val) => {
    if (val >= 80) return '#2ecc71';
    if (val >= 50) return '#f39c12';
    return '#e74c3c';
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flexGrow: 1 }}>
        <LinearProgress
          variant="determinate"
          value={value}
          sx={{
            height,
            borderRadius: height / 2,
            backgroundColor: '#ecf0f1',
            '& .MuiLinearProgress-bar': {
              backgroundColor: color || getColorByValue(value),
              borderRadius: height / 2,
            },
          }}
        />
      </Box>
      <Typography variant="body2" sx={{ minWidth: 40 }}>
        {value}%
      </Typography>
    </Box>
  );
};

const Habits = () => {
  const { showError, showSuccess } = useNotification();
  const [activeTab, setActiveTab] = useState(0); // 0 = This Week, 1 = Monthly
  const [habits, setHabits] = useState([]);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuHabit, setMenuHabit] = useState(null);

  // Status cycle for quick logging
  const statusCycle = ['pending', 'done', 'missed', 'skipped'];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [habitsRes, weeklyRes, monthlyRes] = await Promise.all([
        getHabits(),
        getWeeklySummary(),
        getMonthlySummary(),
      ]);
      setHabits(habitsRes.data);
      setWeeklySummary(weeklyRes.data);
      setMonthlySummary(monthlyRes.data);
    } catch (error) {
      showError('فشل تحميل بيانات العادات');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveHabit = async (payload) => {
    try {
      if (editingHabit) {
        await updateHabit(editingHabit.id, payload);
        showSuccess('تم تحديث العادة بنجاح');
      } else {
        await createHabit(payload);
        showSuccess('تم إنشاء العادة بنجاح');
      }
      setDialogOpen(false);
      setEditingHabit(null);
      loadData();
    } catch (error) {
      showError('فشل حفظ العادة');
    }
  };

  const handleDeleteHabit = async (habit) => {
    try {
      await deleteHabit(habit.id);
      showSuccess('تم حذف العادة');
      loadData();
    } catch (error) {
      showError('فشل حذف العادة');
    }
    handleCloseMenu();
  };

  const handleArchiveHabit = async (habit) => {
    try {
      await archiveHabit(habit.id, !habit.archived);
      showSuccess(habit.archived ? 'تم استعادة العادة' : 'تم أرشفة العادة');
      loadData();
    } catch (error) {
      showError('فشل أرشفة العادة');
    }
    handleCloseMenu();
  };

  const handleLogHabit = async (habitId, date, currentStatus) => {
    const currentIndex = statusCycle.indexOf(currentStatus);
    const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];

    try {
      await logHabit(habitId, date, nextStatus);
      loadData(); // Refresh data after logging
    } catch (error) {
      showError('فشل تسجيل حالة العادة');
    }
  };

  const handleOpenMenu = (event, habit) => {
    setMenuAnchor(event.currentTarget);
    setMenuHabit(habit);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuHabit(null);
  };

  const formatDayHeader = (dateStr) => {
    const date = dayjs(dateStr);
    const today = dayjs().format('YYYY-MM-DD');
    const isToday = dateStr === today;
    return {
      day: date.format('ddd'),
      date: date.format('D'),
      month: date.format('MMM'),
      isToday,
    };
  };

  // Render This Week view
  const renderWeeklyView = () => {
    if (!weeklySummary) {
      return <Typography>جاري تحميل ملخص الأسبوع...</Typography>;
    }

    const { weekDays, habits: habitSummaries, dailyAverages, weekAverage } = weeklySummary;
    const today = dayjs().format('YYYY-MM-DD');

    return (
      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 180, fontWeight: 'bold' }}>العادة</TableCell>
              {weekDays.map((dateStr) => {
                const { day, date, month, isToday } = formatDayHeader(dateStr);
                return (
                  <TableCell
                    key={dateStr}
                    align="center"
                    sx={{
                      minWidth: 70,
                      backgroundColor: isToday ? 'primary.light' : 'inherit',
                      color: isToday ? 'primary.contrastText' : 'inherit',
                    }}
                  >
                    <Typography variant="caption" display="block">
                      {day}
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {date} {month}
                    </Typography>
                  </TableCell>
                );
              })}
              <TableCell align="center" sx={{ minWidth: 150, fontWeight: 'bold' }}>
                تقدم الأسبوع
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {habitSummaries.map((habit) => (
              <TableRow key={habit.id} hover>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                      sx={{
                        width: 8,
                        height: 32,
                        borderRadius: 1,
                        backgroundColor: habit.color,
                      }}
                    />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {habit.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {habit.category}
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => handleOpenMenu(e, habits.find((h) => h.id === habit.id))}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
                {weekDays.map((dateStr) => {
                  const log = habit.dailyLogs[dateStr] || { status: 'pending' };
                  const isFuture = dateStr > today;
                  return (
                    <TableCell key={dateStr} align="center">
                      <StatusIcon
                        status={log.status}
                        onClick={() => handleLogHabit(habit.id, dateStr, log.status)}
                        disabled={isFuture}
                      />
                    </TableCell>
                  );
                })}
                <TableCell>
                  <ProgressBar value={habit.weekProgress} color={habit.color} />
                </TableCell>
              </TableRow>
            ))}
            {/* Daily averages row */}
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Daily Average</TableCell>
              {weekDays.map((dateStr) => {
                const avg = dailyAverages[dateStr];
                return (
                  <TableCell key={dateStr} align="center">
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={avg === null ? 'text.disabled' : 'inherit'}
                    >
                      {avg !== null ? `${avg}%` : '-'}
                    </Typography>
                  </TableCell>
                );
              })}
              <TableCell>
                <Chip
                  label={`Week Avg: ${weekAverage}%`}
                  color={weekAverage >= 70 ? 'success' : weekAverage >= 40 ? 'warning' : 'error'}
                  size="small"
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render Monthly view
  const renderMonthlyView = () => {
    if (!monthlySummary) {
      return <Typography>Loading monthly summary...</Typography>;
    }

    const { habits: habitStats, month, year } = monthlySummary;
    const monthName = dayjs().month(month - 1).format('MMMM');

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          {monthName} {year}
        </Typography>
        <Grid container spacing={2}>
          {habitStats.map((habit) => (
            <Grid item xs={12} md={6} key={habit.id}>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box
                            sx={{
                              width: 8,
                              height: 24,
                              borderRadius: 1,
                              backgroundColor: habit.color,
                            }}
                          />
                          <Typography variant="h6">{habit.name}</Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {habit.category}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenMenu(e, habits.find((h) => h.id === habit.id))}
                      >
                        <MoreVert />
                      </IconButton>
                    </Stack>

                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        التقدم الشهري
                      </Typography>
                      <ProgressBar value={habit.monthlyPercentage} color={habit.color} height={12} />
                    </Box>

                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      <Chip
                        icon={<LocalFireDepartment />}
                        label={`الحالي: ${habit.currentStreak} يوم`}
                        size="small"
                        color={habit.currentStreak > 0 ? 'warning' : 'default'}
                      />
                      <Chip
                        icon={<TrendingUp />}
                        label={`الأفضل: ${habit.longestStreak} يوم`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={`${habit.completed}/${habit.total} يوم`}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {habitStats.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary" align="center">
                لا توجد عادات بعد. أضف عادتك الأولى للبدء بالمتابعة!
              </Typography>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4">العادات</Typography>
          <Typography color="text.secondary">
            تابع عاداتك اليومية وابنِ الاستمرارية
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditingHabit(null);
            setDialogOpen(true);
          }}
        >
          إضافة عادة
        </Button>
      </Stack>

      {/* View Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab label="هذا الأسبوع" />
          <Tab label="نظرة شهرية" />
        </Tabs>
      </Box>

      {/* Content */}
      {loading ? (
        <Box sx={{ py: 4 }}>
          <LinearProgress />
          <Typography align="center" sx={{ mt: 2 }}>
            جاري تحميل العادات...
          </Typography>
        </Box>
      ) : (
        <>
          {activeTab === 0 && renderWeeklyView()}
          {activeTab === 1 && renderMonthlyView()}
        </>
      )}

      {/* Habit Dialog */}
      <HabitDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingHabit(null);
        }}
        onSave={handleSaveHabit}
        initialValues={editingHabit}
      />

      {/* Context Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseMenu}>
        <MenuItem
          onClick={() => {
            setEditingHabit(menuHabit);
            setDialogOpen(true);
            handleCloseMenu();
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>تعديل</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleArchiveHabit(menuHabit)}>
          <ListItemIcon>
            <Archive fontSize="small" />
          </ListItemIcon>
          <ListItemText>{menuHabit?.archived ? 'استعادة' : 'أرشفة'}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDeleteHabit(menuHabit)}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>حذف</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Habits;
