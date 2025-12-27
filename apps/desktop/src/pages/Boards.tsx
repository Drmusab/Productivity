// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Skeleton,
  Fade,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  Add,
  MoreVert,
  Delete,
  ContentCopy,
  Dashboard,
  AccessTime,
  Assignment
} from '@mui/icons-material';
import { getBoards, createBoard, deleteBoard, duplicateBoard } from '../services/boardService';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';

const BoardSkeleton = () => (
  <Card sx={{ height: '100%', minHeight: 200 }}>
    <CardContent>
      <Skeleton variant="text" width="60%" height={32} />
      <Skeleton variant="text" width="90%" sx={{ mt: 1 }} />
      <Skeleton variant="text" width="70%" />
      <Box sx={{ mt: 3 }}>
        <Skeleton variant="text" width="40%" />
      </Box>
    </CardContent>
  </Card>
);

const Boards = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [boardName, setBoardName] = useState('');
  const [boardDescription, setBoardDescription] = useState('');
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        const response = await getBoards();
        setBoards(response.data);
        setLoading(false);
      } catch (error) {
        showError('فشل تحميل اللوحات');
        setLoading(false);
      }
    };

    fetchBoards();
  }, [showError]);

  const handleCreateBoard = async () => {
    try {
      setCreating(true);
      await createBoard({
        name: boardName,
        description: boardDescription,
        created_by: user.id
      });

      showSuccess('تم إنشاء اللوحة بنجاح');
      setDialogOpen(false);
      setBoardName('');
      setBoardDescription('');
      
      // Refresh boards
      const response = await getBoards();
      setBoards(response.data);
    } catch (error) {
      showError('فشل إنشاء اللوحة');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBoard = async (boardId) => {
    try {
      await deleteBoard(boardId);
      showSuccess('تم حذف اللوحة بنجاح');
      
      // Refresh boards
      const response = await getBoards();
      setBoards(response.data);
    } catch (error) {
      showError('فشل حذف اللوحة');
    }
    
    setMenuAnchor(null);
  };

  const handleDuplicateBoard = async (boardId) => {
    try {
      const board = boards.find(b => b.id === boardId);
      await duplicateBoard(boardId, `${board.name} (Copy)`, user.id);

      showSuccess('تم نسخ اللوحة بنجاح');
      
      // Refresh boards
      const response = await getBoards();
      setBoards(response.data);
    } catch (error) {
      showError('فشل نسخ اللوحة');
    }
    
    setMenuAnchor(null);
  };

  const handleMenuClick = (event, board) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedBoard(board);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedBoard(null);
  };

  const gradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  ];

  const getGradient = (index) => gradients[index % gradients.length];

  return (
    <Box 
      sx={{ 
        p: { xs: 2, md: 4 },
        minHeight: 'calc(100vh - 64px)',
        background: 'linear-gradient(180deg, rgba(102,126,234,0.03) 0%, rgba(255,255,255,0) 100%)',
      }}
    >
      {/* Header Section */}
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
            <Dashboard sx={{ color: 'white', fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700} color="text.primary">
              لوحاتي
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {boards.length} لوحة نشطة
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Stats Bar */}
      <Box 
        sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 4, 
          flexWrap: 'wrap',
        }}
      >
        {[
          { icon: <Dashboard />, label: 'إجمالي اللوحات', value: boards.length, color: '#6366f1' },
          { icon: <Assignment />, label: 'اللوحة الأحدث', value: boards[0]?.name || '-', color: '#10b981' },
        ].map((stat, index) => (
          <Fade in key={index} timeout={500 + index * 100}>
            <Box
              sx={{
                flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)', md: '0 1 auto' },
                p: 2.5,
                borderRadius: 3,
                background: 'white',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: stat.color,
                  boxShadow: `0 4px 12px ${stat.color}20`,
                },
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  background: `${stat.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stat.color,
                }}
              >
                {stat.icon}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  {stat.label}
                </Typography>
                <Typography variant="h6" fontWeight={700} color="text.primary">
                  {stat.value}
                </Typography>
              </Box>
            </Box>
          </Fade>
        ))}
      </Box>
      
      {/* Boards Grid */}
      <Grid container spacing={3}>
        {loading ? (
          // Loading skeletons
          [...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <BoardSkeleton />
            </Grid>
          ))
        ) : boards.length === 0 ? (
          // Empty state
          <Grid item xs={12}>
            <Fade in>
              <Box
                sx={{
                  textAlign: 'center',
                  py: 10,
                  px: 4,
                  background: 'white',
                  borderRadius: 4,
                  border: '2px dashed',
                  borderColor: 'divider',
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    boxShadow: '0 10px 25px rgba(102, 126, 234, 0.35)',
                  }}
                >
                  <Add sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Typography variant="h5" fontWeight={600} gutterBottom>
                  لا توجد لوحات بعد
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  ابدأ بإنشاء أول لوحة لتنظيم مهامك
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setDialogOpen(true)}
                  sx={{
                    px: 4,
                    py: 1.5,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    },
                  }}
                >
                  إنشاء لوحة جديدة
                </Button>
              </Box>
            </Fade>
          </Grid>
        ) : (
          // Board cards
          boards.map((board, index) => (
            <Grid item xs={12} sm={6} md={4} key={board.id}>
              <Fade in timeout={300 + index * 100}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'transparent',
                    '&:hover': {
                      borderColor: 'primary.main',
                      '& .board-gradient': {
                        transform: 'scale(1.05)',
                      },
                    },
                  }}
                  onClick={() => navigate(`/board/${board.id}`)}
                >
                  {/* Gradient header */}
                  <Box
                    className="board-gradient"
                    sx={{
                      height: 8,
                      background: getGradient(index),
                      transition: 'transform 0.3s ease',
                    }}
                  />
                  
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography 
                          variant="h6" 
                          fontWeight={700}
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {board.name}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, board)}
                        sx={{
                          ml: 1,
                          opacity: 0.6,
                          '&:hover': { opacity: 1, background: 'rgba(0,0,0,0.05)' },
                        }}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </Box>
                    
                    {board.description && (
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          mb: 3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.6,
                        }}
                      >
                        {board.description}
                      </Typography>
                    )}
                    
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1,
                        pt: 2,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(board.created_at).toLocaleDateString('ar-SA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          ))
        )}
      </Grid>
      
      {/* Create Board FAB */}
      <Tooltip title="إنشاء لوحة جديدة" placement="left">
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 60,
            height: 60,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.45)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.1) rotate(90deg)',
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              boxShadow: '0 12px 35px rgba(102, 126, 234, 0.55)',
            },
          }}
          onClick={() => setDialogOpen(true)}
        >
          <Add sx={{ fontSize: 28 }} />
        </Fab>
      </Tooltip>

      {/* Create Board Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => !creating && setDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4 },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            إنشاء لوحة جديدة
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            أنشئ لوحة جديدة لتنظيم مهامك ومشاريعك
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="اسم اللوحة"
            placeholder="مثال: مشروع التطبيق الجديد"
            fullWidth
            variant="outlined"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            sx={{ mt: 1 }}
          />
          <TextField
            margin="dense"
            label="الوصف (اختياري)"
            placeholder="صف الغرض من هذه اللوحة..."
            fullWidth
            variant="outlined"
            multiline
            rows={4}
            value={boardDescription}
            onChange={(e) => setBoardDescription(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button 
            onClick={() => setDialogOpen(false)} 
            disabled={creating}
            sx={{ px: 3 }}
          >
            إلغاء
          </Button>
          <Button 
            onClick={handleCreateBoard} 
            variant="contained"
            disabled={!boardName.trim() || creating}
            sx={{
              px: 4,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              },
              '&:disabled': {
                background: 'rgba(0,0,0,0.12)',
              },
            }}
          >
            {creating ? 'جاري الإنشاء...' : 'إنشاء'}
          </Button>
        </DialogActions>
        {creating && <LinearProgress />}
      </Dialog>
      
      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: 180,
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1.5,
              borderRadius: 1.5,
              mx: 1,
              my: 0.5,
            },
          },
        }}
      >
        <MenuItem onClick={() => {
          navigate(`/board/${selectedBoard?.id}`);
          handleMenuClose();
        }}>
          <Dashboard sx={{ ml: 1.5, fontSize: 20, color: 'text.secondary' }} />
          فتح
        </MenuItem>
        <MenuItem onClick={() => selectedBoard && handleDuplicateBoard(selectedBoard.id)}>
          <ContentCopy sx={{ ml: 1.5, fontSize: 20, color: 'text.secondary' }} /> 
          تكرار
        </MenuItem>
        <Divider sx={{ my: 1 }} />
        <MenuItem 
          onClick={() => selectedBoard && handleDeleteBoard(selectedBoard.id)}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ ml: 1.5, fontSize: 20 }} /> 
          حذف
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Boards;