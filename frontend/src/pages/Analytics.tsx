import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Skeleton,
  Fade,
  alpha
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp,
  Assignment,
  CheckCircle,
  Warning,
  Speed,
  Download
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { getTasks } from '../services/taskService';
import { getBoards } from '../services/boardService';
import { useNotification } from '../contexts/NotificationContext';

const StatCard = ({ icon, title, value, subtitle, color, trend }) => (
  <Card
    sx={{
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
      border: '1px solid',
      borderColor: 'divider',
      transition: 'all 0.3s ease',
      '&:hover': {
        borderColor: color,
        boxShadow: `0 8px 25px ${alpha(color, 0.15)}`,
        transform: 'translateY(-2px)',
      },
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 3,
            background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 14px ${alpha(color, 0.35)}`,
          }}
        >
          {React.cloneElement(icon, { sx: { color: 'white', fontSize: 26 } })}
        </Box>
        {trend && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              backgroundColor: trend > 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: trend > 0 ? '#22c55e' : '#ef4444',
            }}
          >
            <TrendingUp sx={{ fontSize: 16, transform: trend < 0 ? 'rotate(180deg)' : 'none' }} />
            <Typography variant="caption" fontWeight={600}>
              {Math.abs(trend)}%
            </Typography>
          </Box>
        )}
      </Box>
      <Typography variant="h3" fontWeight={700} color="text.primary" sx={{ mb: 0.5 }}>
        {value}
      </Typography>
      <Typography variant="body2" color="text.secondary" fontWeight={500}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const ChartCard = ({ title, subtitle, children }) => (
  <Card
    sx={{
      height: '100%',
      border: '1px solid',
      borderColor: 'divider',
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" fontWeight={600} color="text.primary">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      {children}
    </CardContent>
  </Card>
);

const Analytics = () => {
  const { showError } = useNotification();
  
  const [tasks, setTasks] = useState([]);
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [timeRange, setTimeRange] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksResponse, boardsResponse] = await Promise.all([
          getTasks(),
          getBoards()
        ]);
        
        setTasks(tasksResponse.data);
        setBoards(boardsResponse.data);
        setLoading(false);
      } catch (error) {
        showError('فشل تحميل بيانات التحليلات');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [showError]);

  const filteredTasks = selectedBoard 
    ? tasks.filter(task => String(task.board_id) === String(selectedBoard))
    : tasks;

  // Task completion by column
  const tasksByColumn = [];
  const columns = [...new Set(filteredTasks.map(task => task.column_name).filter(Boolean))];
  
  columns.forEach(column => {
    const columnTasks = filteredTasks.filter(task => task.column_name === column);
    tasksByColumn.push({
      name: column,
      total: columnTasks.length,
      completed: columnTasks.filter(task => task.column_name === 'Done').length
    });
  });

  // Task distribution by priority
  const tasksByPriority = [];
  const priorities = ['critical', 'high', 'medium', 'low'];
  
  priorities.forEach(priority => {
    const priorityTasks = filteredTasks.filter(task => task.priority === priority);
    if (priorityTasks.length > 0) {
      tasksByPriority.push({
        name: priority === 'critical' ? 'حرج' : priority === 'high' ? 'عالي' : priority === 'medium' ? 'متوسط' : 'منخفض',
        value: priorityTasks.length
      });
    }
  });

  // Task completion over time
  const completionOverTime = [
    { date: 'السبت', completed: 4, created: 6 },
    { date: 'الأحد', completed: 3, created: 5 },
    { date: 'الاثنين', completed: 5, created: 8 },
    { date: 'الثلاثاء', completed: 7, created: 4 },
    { date: 'الأربعاء', completed: 6, created: 7 },
    { date: 'الخميس', completed: 2, created: 3 },
    { date: 'الجمعة', completed: 1, created: 2 }
  ];

  // Overdue tasks
  const now = new Date();
  const overdueTasks = filteredTasks.filter(task => 
    task.due_date && new Date(task.due_date) < now && task.column_name !== 'Done'
  );

  const completedTasks = filteredTasks.filter(task => task.column_name === 'Done');
  const completionRate = filteredTasks.length > 0 
    ? Math.round((completedTasks.length / filteredTasks.length) * 100)
    : 0;

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

  if (loading) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        <Skeleton variant="text" width={200} height={40} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {[...Array(4)].map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
          {[...Array(4)].map((_, i) => (
            <Grid item xs={12} md={6} key={`chart-${i}`}>
              <Skeleton variant="rounded" height={350} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        p: { xs: 2, md: 4 },
        minHeight: 'calc(100vh - 64px)',
        background: 'linear-gradient(180deg, rgba(102,126,234,0.03) 0%, rgba(255,255,255,0) 100%)',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(102, 126, 234, 0.35)',
            }}
          >
            <AnalyticsIcon sx={{ color: 'white', fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700} color="text.primary">
              التحليلات
            </Typography>
            <Typography variant="body2" color="text.secondary">
              تتبع أداء مهامك وإنتاجيتك
            </Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Filters */}
      <Fade in timeout={300}>
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 2, 
            mb: 4,
            flexWrap: 'wrap',
            p: 2.5,
            borderRadius: 3,
            background: 'white',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <FormControl sx={{ minWidth: 200 }} size="small">
            <InputLabel>اللوحة</InputLabel>
            <Select
              value={selectedBoard}
              onChange={(e) => setSelectedBoard(e.target.value)}
              label="اللوحة"
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="">جميع اللوحات</MenuItem>
              {boards.map(board => (
                <MenuItem key={board.id} value={board.id}>
                  {board.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }} size="small">
            <InputLabel>النطاق الزمني</InputLabel>
            <Select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              label="النطاق الزمني"
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="day">اليوم</MenuItem>
              <MenuItem value="week">هذا الأسبوع</MenuItem>
              <MenuItem value="month">هذا الشهر</MenuItem>
              <MenuItem value="year">هذه السنة</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ flexGrow: 1 }} />

          <Button 
            variant="outlined" 
            startIcon={<Download />}
            sx={{ 
              borderRadius: 2,
              px: 3,
            }}
          >
            تصدير التقرير
          </Button>
        </Box>
      </Fade>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Fade in timeout={400}>
            <Box>
              <StatCard
                icon={<Assignment />}
                title="إجمالي المهام"
                value={filteredTasks.length}
                color="#6366f1"
                trend={12}
              />
            </Box>
          </Fade>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Fade in timeout={500}>
            <Box>
              <StatCard
                icon={<CheckCircle />}
                title="المهام المكتملة"
                value={completedTasks.length}
                color="#22c55e"
                trend={8}
              />
            </Box>
          </Fade>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Fade in timeout={600}>
            <Box>
              <StatCard
                icon={<Warning />}
                title="المهام المتأخرة"
                value={overdueTasks.length}
                color="#ef4444"
                trend={-5}
              />
            </Box>
          </Fade>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Fade in timeout={700}>
            <Box>
              <StatCard
                icon={<Speed />}
                title="نسبة الإكمال"
                value={`${completionRate}%`}
                color="#f59e0b"
                trend={3}
              />
            </Box>
          </Fade>
        </Grid>
      </Grid>
      
      {/* Charts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Fade in timeout={800}>
            <Box>
              <ChartCard title="المهام حسب العمود" subtitle="توزيع المهام على الأعمدة">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tasksByColumn}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.6}/>
                      </linearGradient>
                      <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.9}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.6}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: 12, 
                        border: 'none', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
                      }} 
                    />
                    <Legend />
                    <Bar dataKey="total" fill="url(#colorTotal)" name="الإجمالي" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" fill="url(#colorCompleted)" name="المكتملة" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </Box>
          </Fade>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Fade in timeout={900}>
            <Box>
              <ChartCard title="توزيع الأولويات" subtitle="المهام حسب مستوى الأولوية">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={tasksByPriority}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {tasksByPriority.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: 12, 
                        border: 'none', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
                      }} 
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </Box>
          </Fade>
        </Grid>
        
        <Grid item xs={12}>
          <Fade in timeout={1000}>
            <Box>
              <ChartCard title="نشاط المهام عبر الزمن" subtitle="المهام المنشأة والمكتملة خلال الأسبوع">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={completionOverTime}>
                    <defs>
                      <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorCompletedLine" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: 12, 
                        border: 'none', 
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)' 
                      }} 
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="created" 
                      stroke="#6366f1" 
                      strokeWidth={2}
                      fill="url(#colorCreated)" 
                      name="المضافة" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="completed" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      fill="url(#colorCompletedLine)" 
                      name="المكتملة" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </Box>
          </Fade>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics;