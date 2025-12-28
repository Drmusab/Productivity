// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  Stack,
  FormHelperText,
} from '@mui/material';

const CATEGORIES = [
  { value: 'health', label: 'الصحة', color: '#2ecc71' },
  { value: 'learning', label: 'التعلم', color: '#3498db' },
  { value: 'mindset', label: 'العقلية', color: '#9b59b6' },
  { value: 'productivity', label: 'الإنتاجية', color: '#e67e22' },
  { value: 'social', label: 'اجتماعي', color: '#e74c3c' },
  { value: 'general', label: 'عام', color: '#95a5a6' },
];

const COLORS = [
  '#e74c3c', '#e67e22', '#f39c12', '#2ecc71', '#1abc9c',
  '#3498db', '#9b59b6', '#34495e', '#95a5a6', '#7f8c8d',
];

const GOAL_TYPES = [
  { value: 'binary', label: 'نعم/لا (منجز أو غير منجز)' },
  { value: 'numeric', label: 'رقمي (مثل: ٨ أكواب ماء)' },
  { value: 'timer', label: 'مؤقت (مثل: ٣٠ دقيقة تمرين)' },
];

interface HabitValues {
  name?: string;
  description?: string;
  category?: string;
  goalType?: string;
  goalValue?: number;
  goalUnit?: string;
  color?: string;
  [key: string]: any;
}

interface HabitDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: any) => void;
  initialValues?: HabitValues | null;
}

const HabitDialog: React.FC<HabitDialogProps> = ({ open, onClose, onSave, initialValues = null }) => {
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<string>('general');
  const [goalType, setGoalType] = useState<string>('binary');
  const [goalValue, setGoalValue] = useState<number>(1);
  const [goalUnit, setGoalUnit] = useState<string>('');
  const [color, setColor] = useState<string>('#3498db');
  const [errors, setErrors] = useState<any>({});

  const isEditing = Boolean(initialValues);

  useEffect(() => {
    if (initialValues) {
      setName(initialValues.name || '');
      setDescription(initialValues.description || '');
      setCategory(initialValues.category || 'general');
      setGoalType(initialValues.goalType || 'binary');
      setGoalValue(initialValues.goalValue || 1);
      setGoalUnit(initialValues.goalUnit || '');
      setColor(initialValues.color || '#3498db');
    } else {
      // Reset form for new habit
      setName('');
      setDescription('');
      setCategory('general');
      setGoalType('binary');
      setGoalValue(1);
      setGoalUnit('');
      setColor('#3498db');
    }
    setErrors({});
  }, [initialValues, open]);

  const validate = () => {
    const newErrors: any = {};
    if (!name.trim()) {
      newErrors.name = 'اسم العادة مطلوب';
    }
    if (goalType !== 'binary' && goalValue < 1) {
      newErrors.goalValue = 'يجب أن تكون قيمة الهدف 1 على الأقل';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload = {
      name: name.trim(),
      description: description.trim(),
      category,
      goalType,
      goalValue: goalType === 'binary' ? 1 : goalValue,
      goalUnit: goalType === 'binary' ? '' : goalUnit,
      color,
    };

    onSave(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditing ? 'تعديل عادة' : 'إضافة عادة جديدة'}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="اسم العادة"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            required
            error={Boolean(errors.name)}
            helperText={errors.name}
            placeholder="مثال: شرب ٨ أكواب ماء"
          />

          <TextField
            label="الوصف (اختياري)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="أضف تفاصيل عن هذه العادة..."
          />

          <FormControl fullWidth>
            <InputLabel>التصنيف</InputLabel>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              label="التصنيف"
            >
              {CATEGORIES.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: cat.color,
                      }}
                    />
                    {cat.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>نوع الهدف</InputLabel>
            <Select
              value={goalType}
              onChange={(e) => setGoalType(e.target.value)}
              label="نوع الهدف"
            >
              {GOAL_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {goalType === 'binary' && 'تتبع بسيط بنعم/لا لإكمال العادة'}
              {goalType === 'numeric' && 'تتبع كمية محددة (مثلاً: أكواب ماء)'}
              {goalType === 'timer' && 'تتبع الوقت المستغرق (بالدقائق)'}
            </FormHelperText>
          </FormControl>

          {goalType !== 'binary' && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="قيمة الهدف"
                type="number"
                value={goalValue}
                onChange={(e) => setGoalValue(parseInt(e.target.value) || 1)}
                inputProps={{ min: 1 }}
                error={Boolean(errors.goalValue)}
                helperText={errors.goalValue}
                sx={{ flex: 1 }}
              />
              <TextField
                label="الوحدة"
                value={goalUnit}
                onChange={(e) => setGoalUnit(e.target.value)}
                placeholder={goalType === 'timer' ? 'دقائق' : 'أكواب'}
                sx={{ flex: 1 }}
              />
            </Box>
          )}

          <Box>
            <InputLabel sx={{ mb: 1 }}>اللون</InputLabel>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {COLORS.map((c) => (
                <Chip
                  key={c}
                  size="small"
                  onClick={() => setColor(c)}
                  sx={{
                    backgroundColor: c,
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: color === c ? '3px solid #000' : '2px solid transparent',
                    '&:hover': { backgroundColor: c },
                  }}
                />
              ))}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {isEditing ? 'حفظ التعديلات' : 'إضافة عادة'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default HabitDialog;
