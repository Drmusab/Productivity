// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  PlayArrow
} from '@mui/icons-material';
import { getIntegrations, createIntegration, updateIntegration, deleteIntegration, testN8nWebhook } from '../services/integrationService';
import { getAutomationRules, createAutomationRule, updateAutomationRule, deleteAutomationRule } from '../services/automationService';
import { getSettings, updateReportSchedule } from '../services/settingsService';
import { useNotification } from '../contexts/NotificationContext';

const Settings = () => {
  const { showSuccess, showError } = useNotification();
  
  const [activeTab, setActiveTab] = useState('general');
  const [integrations, setIntegrations] = useState([]);
  const [automationRules, setAutomationRules] = useState([]);
  const [integrationDialogOpen, setIntegrationDialogOpen] = useState(false);
  const [automationDialogOpen, setAutomationDialogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [selectedAutomationRule, setSelectedAutomationRule] = useState(null);
  const [testWebhookDialogOpen, setTestWebhookDialogOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [reportDay, setReportDay] = useState(1); // 1 = Monday
  const [reportHour, setReportHour] = useState(9);
  const [reportMinute, setReportMinute] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [integrationsResponse, automationRulesResponse, settingsResponse] = await Promise.all([
          getIntegrations(),
          getAutomationRules(),
          getSettings()
        ]);
        
        setIntegrations(integrationsResponse.data);
        setAutomationRules(automationRulesResponse.data);
        
        // Load report schedule settings
        const settings = settingsResponse.data;
        if (settings.report_schedule_day) {
          setReportDay(parseInt(settings.report_schedule_day));
        }
        if (settings.report_schedule_hour) {
          setReportHour(parseInt(settings.report_schedule_hour));
        }
        if (settings.report_schedule_minute) {
          setReportMinute(parseInt(settings.report_schedule_minute));
        }
      } catch (error) {
        showError('Failed to load settings data');
      }
    };
    
    fetchData();
  }, [showError]);

  const handleCreateIntegration = async (integration) => {
    try {
      await createIntegration(integration);
      showSuccess('Integration created successfully');
      
      // Refresh integrations
      const response = await getIntegrations();
      setIntegrations(response.data);
      
      setIntegrationDialogOpen(false);
      setSelectedIntegration(null);
    } catch (error) {
      showError('Failed to create integration');
    }
  };

  const handleUpdateIntegration = async (id, integration) => {
    try {
      await updateIntegration(id, integration);
      showSuccess('Integration updated successfully');
      
      // Refresh integrations
      const response = await getIntegrations();
      setIntegrations(response.data);
      
      setIntegrationDialogOpen(false);
      setSelectedIntegration(null);
    } catch (error) {
      showError('Failed to update integration');
    }
  };

  const handleDeleteIntegration = async (id) => {
    try {
      await deleteIntegration(id);
      showSuccess('Integration deleted successfully');
      
      // Refresh integrations
      const response = await getIntegrations();
      setIntegrations(response.data);
    } catch (error) {
      showError('Failed to delete integration');
    }
  };

  const handleTestWebhook = async () => {
    try {
      const response = await testN8nWebhook({ webhookUrl, apiKey });
      
      if (response.data.success) {
        showSuccess('Webhook test successful');
      } else {
        showError(`Webhook test failed: ${response.data.error}`);
      }
      
      setTestWebhookDialogOpen(false);
      setWebhookUrl('');
      setApiKey('');
    } catch (error) {
      showError('Webhook test failed');
    }
  };

  const handleCreateAutomationRule = async (rule) => {
    try {
      await createAutomationRule(rule);
      showSuccess('Automation rule created successfully');
      
      // Refresh automation rules
      const response = await getAutomationRules();
      setAutomationRules(response.data);
      
      setAutomationDialogOpen(false);
      setSelectedAutomationRule(null);
    } catch (error) {
      showError('Failed to create automation rule');
    }
  };

  const handleUpdateAutomationRule = async (id, rule) => {
    try {
      await updateAutomationRule(id, rule);
      showSuccess('Automation rule updated successfully');
      
      // Refresh automation rules
      const response = await getAutomationRules();
      setAutomationRules(response.data);
      
      setAutomationDialogOpen(false);
      setSelectedAutomationRule(null);
    } catch (error) {
      showError('Failed to update automation rule');
    }
  };

  const handleDeleteAutomationRule = async (id) => {
    try {
      await deleteAutomationRule(id);
      showSuccess('Automation rule deleted successfully');
      
      // Refresh automation rules
      const response = await getAutomationRules();
      setAutomationRules(response.data);
    } catch (error) {
      showError('Failed to delete automation rule');
    }
  };

  const handleSaveReportSchedule = async () => {
    try {
      await updateReportSchedule(reportDay, reportHour, reportMinute);
      showSuccess('Report schedule updated successfully. Server restart required for changes to take effect.');
    } catch (error) {
      showError('Failed to update report schedule');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Button
          variant={activeTab === 'general' ? 'contained' : 'text'}
          onClick={() => setActiveTab('general')}
          sx={{ mr: 1 }}
        >
          General
        </Button>
        <Button
          variant={activeTab === 'integrations' ? 'contained' : 'text'}
          onClick={() => setActiveTab('integrations')}
          sx={{ mr: 1 }}
        >
          Integrations
        </Button>
        <Button
          variant={activeTab === 'automation' ? 'contained' : 'text'}
          onClick={() => setActiveTab('automation')}
        >
          Automation
        </Button>
      </Box>
      
      {activeTab === 'general' && (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                General Settings
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={darkMode}
                        onChange={(e) => setDarkMode(e.target.checked)}
                      />
                    }
                    label="Dark Mode"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={notifications}
                        onChange={(e) => setNotifications(e.target.checked)}
                      />
                    }
                    label="Enable Notifications"
                  />
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Weekly Report Schedule
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Configure when the automated weekly report should be generated and sent to n8n webhooks.
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Day of Week</InputLabel>
                    <Select
                      value={reportDay}
                      onChange={(e) => setReportDay(e.target.value)}
                      label="Day of Week"
                    >
                      <MenuItem value={0}>Sunday</MenuItem>
                      <MenuItem value={1}>Monday</MenuItem>
                      <MenuItem value={2}>Tuesday</MenuItem>
                      <MenuItem value={3}>Wednesday</MenuItem>
                      <MenuItem value={4}>Thursday</MenuItem>
                      <MenuItem value={5}>Friday</MenuItem>
                      <MenuItem value={6}>Saturday</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Hour</InputLabel>
                    <Select
                      value={reportHour}
                      onChange={(e) => setReportHour(e.target.value)}
                      label="Hour"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <MenuItem key={i} value={i}>
                          {i.toString().padStart(2, '0')}:00
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Minute</InputLabel>
                    <Select
                      value={reportMinute}
                      onChange={(e) => setReportMinute(e.target.value)}
                      label="Minute"
                    >
                      <MenuItem value={0}>00</MenuItem>
                      <MenuItem value={15}>15</MenuItem>
                      <MenuItem value={30}>30</MenuItem>
                      <MenuItem value={45}>45</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="primary">
                  Current Schedule: Every{' '}
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][reportDay]}{' '}
                  at {reportHour.toString().padStart(2, '0')}:{reportMinute.toString().padStart(2, '0')}
                </Typography>
              </Box>
              
              <Button variant="contained" sx={{ mt: 2 }} onClick={handleSaveReportSchedule}>
                Save Report Schedule
              </Button>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="h6" gutterBottom>
                Backup & Restore
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button variant="contained">Backup Data</Button>
                <Button variant="outlined">Restore Data</Button>
              </Box>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                n8n Webhook Configuration
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Configure your n8n webhook URL for receiving automated notifications, task updates, and reports. 
                This is the primary integration point between the Kanban app and n8n workflows.
              </Typography>
              
              <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                <Typography variant="body2" color="info.contrastText">
                  <strong>Quick Setup:</strong> Go to the Integrations tab to add an n8n webhook, or use the button below to test a webhook URL.
                </Typography>
              </Box>
              
              <Grid container spacing={2} sx={{ mt: 2 }}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Active n8n Webhooks: {integrations.filter(i => i.type === 'n8n_webhook' && i.enabled).length}
                  </Typography>
                  {integrations.filter(i => i.type === 'n8n_webhook' && i.enabled).map(integration => (
                    <Chip
                      key={integration.id}
                      label={integration.name}
                      color="success"
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                  {integrations.filter(i => i.type === 'n8n_webhook' && i.enabled).length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No active webhooks configured. Add one in the Integrations tab.
                    </Typography>
                  )}
                </Grid>
              </Grid>
              
              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<PlayArrow />}
                  onClick={() => setTestWebhookDialogOpen(true)}
                >
                  Test Webhook Connection
                </Button>
                <Button
                  variant="contained"
                  onClick={() => setActiveTab('integrations')}
                >
                  Manage Webhooks
                </Button>
              </Box>
            </CardContent>
          </Card>
        </>
      )}
      
      {activeTab === 'integrations' && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Integrations
              </Typography>
              <Box>
                <Button
                  variant="outlined"
                  startIcon={<PlayArrow />}
                  onClick={() => setTestWebhookDialogOpen(true)}
                  sx={{ mr: 1 }}
                >
                  Test Webhook
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    setSelectedIntegration(null);
                    setIntegrationDialogOpen(true);
                  }}
                >
                  Add Integration
                </Button>
              </Box>
            </Box>
            
            <List>
              {integrations.map(integration => (
                <ListItem key={integration.id} divider>
                  <ListItemText
                    primary={integration.name}
                    secondary={`${integration.type} - ${integration.enabled ? 'Enabled' : 'Disabled'}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => {
                        setSelectedIntegration(integration);
                        setIntegrationDialogOpen(true);
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteIntegration(integration.id)}
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
      
      {activeTab === 'automation' && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Automation Rules
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => {
                  setSelectedAutomationRule(null);
                  setAutomationDialogOpen(true);
                }}
              >
                Add Rule
              </Button>
            </Box>
            
            <List>
              {automationRules.map(rule => (
                <ListItem key={rule.id} divider>
                  <ListItemText
                    primary={rule.name}
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          Trigger: {rule.trigger_type}
                        </Typography>
                        <Typography variant="body2">
                          Action: {rule.action_type}
                        </Typography>
                        <Chip
                          label={rule.enabled ? 'Enabled' : 'Disabled'}
                          color={rule.enabled ? 'success' : 'default'}
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => {
                        setSelectedAutomationRule(rule);
                        setAutomationDialogOpen(true);
                      }}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      edge="end"
                      onClick={() => handleDeleteAutomationRule(rule.id)}
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
      
      {/* Integration Dialog */}
      <IntegrationDialog
        open={integrationDialogOpen}
        integration={selectedIntegration}
        onClose={() => setIntegrationDialogOpen(false)}
        onSave={selectedIntegration ? 
          (integration) => handleUpdateIntegration(selectedIntegration.id, integration) : 
          handleCreateIntegration
        }
      />
      
      {/* Automation Rule Dialog */}
      <AutomationRuleDialog
        open={automationDialogOpen}
        rule={selectedAutomationRule}
        onClose={() => setAutomationDialogOpen(false)}
        onSave={selectedAutomationRule ? 
          (rule) => handleUpdateAutomationRule(selectedAutomationRule.id, rule) : 
          handleCreateAutomationRule
        }
      />
      
      {/* Test Webhook Dialog */}
      <Dialog open={testWebhookDialogOpen} onClose={() => setTestWebhookDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Test Webhook</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Webhook URL"
            fullWidth
            variant="outlined"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            sx={{ mt: 1 }}
          />
          <TextField
            margin="dense"
            label="API Key (Optional)"
            fullWidth
            variant="outlined"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestWebhookDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleTestWebhook} variant="contained">Test</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Integration Dialog Component
const IntegrationDialog = ({ open, integration, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'n8n_webhook',
    config: {
      webhookUrl: '',
      apiKey: ''
    },
    enabled: true
  });

  useEffect(() => {
    if (integration) {
      setFormData(integration);
    } else {
      setFormData({
        name: '',
        type: 'n8n_webhook',
        config: {
          webhookUrl: '',
          apiKey: ''
        },
        enabled: true
      });
    }
  }, [integration, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('config.')) {
      const configField = name.substring(7);
      setFormData(prev => ({
        ...prev,
        config: {
          ...prev.config,
          [configField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {integration ? 'Edit Integration' : 'Add Integration'}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          name="name"
          label="Name"
          fullWidth
          variant="outlined"
          value={formData.name}
          onChange={handleChange}
          sx={{ mt: 1 }}
        />
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Type</InputLabel>
          <Select
            name="type"
            value={formData.type}
            onChange={handleChange}
            label="Type"
          >
            <MenuItem value="n8n_webhook">n8n Webhook</MenuItem>
          </Select>
        </FormControl>
        <TextField
          margin="dense"
          name="config.webhookUrl"
          label="Webhook URL"
          fullWidth
          variant="outlined"
          value={formData.config.webhookUrl}
          onChange={handleChange}
          sx={{ mt: 2 }}
        />
        <TextField
          margin="dense"
          name="config.apiKey"
          label="API Key (Optional)"
          fullWidth
          variant="outlined"
          value={formData.config.apiKey}
          onChange={handleChange}
          sx={{ mt: 2 }}
        />
        <FormControlLabel
          control={
            <Switch
              name="enabled"
              checked={formData.enabled}
              onChange={handleChange}
            />
          }
          label="Enabled"
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

// Automation Rule Dialog Component
const AutomationRuleDialog = ({ open, rule, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'task_created',
    trigger_config: {},
    action_type: 'webhook',
    action_config: {},
    enabled: true
  });

  useEffect(() => {
    if (rule) {
      setFormData(rule);
    } else {
      setFormData({
        name: '',
        trigger_type: 'task_created',
        trigger_config: {},
        action_type: 'webhook',
        action_config: {},
        enabled: true
      });
    }
  }, [rule, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('trigger_config.') || name.startsWith('action_config.')) {
      const [configType, field] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [configType]: {
          ...prev[configType],
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {rule ? 'Edit Automation Rule' : 'Add Automation Rule'}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          name="name"
          label="Name"
          fullWidth
          variant="outlined"
          value={formData.name}
          onChange={handleChange}
          sx={{ mt: 1 }}
        />
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Trigger Type</InputLabel>
              <Select
                name="trigger_type"
                value={formData.trigger_type}
                onChange={handleChange}
                label="Trigger Type"
              >
                <MenuItem value="task_created">Task Created</MenuItem>
                <MenuItem value="task_updated">Task Updated</MenuItem>
                <MenuItem value="task_moved">Task Moved</MenuItem>
                <MenuItem value="task_deleted">Task Deleted</MenuItem>
                <MenuItem value="task_due">Task Due</MenuItem>
                <MenuItem value="task_overdue">Task Overdue</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Action Type</InputLabel>
              <Select
                name="action_type"
                value={formData.action_type}
                onChange={handleChange}
                label="Action Type"
              >
                <MenuItem value="webhook">Send Webhook</MenuItem>
                <MenuItem value="notification">Send Notification</MenuItem>
                <MenuItem value="move_task">Move Task</MenuItem>
                <MenuItem value="update_task">Update Task</MenuItem>
                <MenuItem value="create_task">Create Task</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        {formData.action_type === 'webhook' && (
          <TextField
            margin="dense"
            name="action_config.webhookId"
            label="Webhook ID"
            fullWidth
            variant="outlined"
            value={formData.action_config.webhookId || ''}
            onChange={handleChange}
            sx={{ mt: 2 }}
          />
        )}
        
        {formData.action_type === 'notification' && (
          <>
            <TextField
              margin="dense"
              name="action_config.title"
              label="Notification Title"
              fullWidth
              variant="outlined"
              value={formData.action_config.title || ''}
              onChange={handleChange}
              sx={{ mt: 2 }}
            />
            <TextField
              margin="dense"
              name="action_config.message"
              label="Notification Message"
              fullWidth
              variant="outlined"
              multiline
              rows={2}
              value={formData.action_config.message || ''}
              onChange={handleChange}
              sx={{ mt: 2 }}
            />
          </>
        )}
        
        <FormControlLabel
          control={
            <Switch
              name="enabled"
              checked={formData.enabled}
              onChange={handleChange}
            />
          }
          label="Enabled"
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default Settings;