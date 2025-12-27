// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  Add,
  FormatQuote,
  Spellcheck,
  StickyNote2,
  Delete,
  Favorite,
  Refresh,
  School,
  CheckCircle,
} from '@mui/icons-material';

import { useNotification } from '../contexts/NotificationContext';
import {
  getQuotes,
  getRandomQuote,
  createQuote,
  toggleQuoteFavorite,
  deleteQuote,
  getWords,
  getWordsForReview,
  getWordStats,
  createWord,
  reviewWord,
  deleteWord,
  getStickyNotes,
  createStickyNote,
  deleteStickyNote,
} from '../services/utilityService';

// Sticky note colors
const STICKY_COLORS = [
  '#fef3c7', // Yellow
  '#fce7f3', // Pink
  '#dbeafe', // Blue
  '#dcfce7', // Green
  '#fae8ff', // Purple
  '#fed7aa', // Orange
];

// Main component
const Utilities: React.FC = () => {
  const { showError, showSuccess } = useNotification();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Quotes data
  const [quotes, setQuotes] = useState<any[]>([]);
  const [randomQuote, setRandomQuote] = useState<any>(null);

  // Words data
  const [words, setWords] = useState<any[]>([]);
  const [wordStats, setWordStats] = useState<any>(null);
  const [reviewWords, setReviewWords] = useState<any[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  // Sticky notes data
  const [stickyNotes, setStickyNotes] = useState<any[]>([]);

  // Dialogs
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [wordDialogOpen, setWordDialogOpen] = useState(false);
  const [stickyDialogOpen, setStickyDialogOpen] = useState(false);

  // Forms
  const [quoteForm, setQuoteForm] = useState({
    content: '',
    author: '',
    source: '',
    category: '',
  });

  const [wordForm, setWordForm] = useState({
    word: '',
    definition: '',
    pronunciation: '',
    part_of_speech: '',
    example_sentence: '',
    origin: '',
    synonyms: [] as string[],
    antonyms: [] as string[],
    category: '',
  });

  const [stickyForm, setStickyForm] = useState({
    content: '',
    color: '#fef3c7',
  });

  const [synonymInput, setSynonymInput] = useState('');
  const [antonymInput, setAntonymInput] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [quotesRes, randomRes, wordsRes, statsRes, stickyRes] = await Promise.all([
        getQuotes(),
        getRandomQuote(),
        getWords(),
        getWordStats(),
        getStickyNotes(),
      ]);

      setQuotes(quotesRes.data);
      setRandomQuote(randomRes.data);
      setWords(wordsRes.data);
      setWordStats(statsRes.data);
      setStickyNotes(stickyRes.data);
    } catch (error) {
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Quote handlers
  const handleSaveQuote = async () => {
    try {
      await createQuote(quoteForm);
      showSuccess('Quote added');
      setQuoteDialogOpen(false);
      setQuoteForm({ content: '', author: '', source: '', category: '' });
      loadData();
    } catch (error) {
      showError('Failed to add quote');
    }
  };

  const handleToggleQuoteFavorite = async (id: string) => {
    try {
      await toggleQuoteFavorite(id);
      loadData();
    } catch (error) {
      showError('Failed to update quote');
    }
  };

  const handleDeleteQuote = async (id: string) => {
    try {
      await deleteQuote(id);
      showSuccess('Quote deleted');
      loadData();
    } catch (error) {
      showError('Failed to delete quote');
    }
  };

  const handleNewRandomQuote = async () => {
    try {
      const res = await getRandomQuote();
      setRandomQuote(res.data);
    } catch (error) {
      showError('Failed to get quote');
    }
  };

  // Word handlers
  const handleSaveWord = async () => {
    try {
      await createWord(wordForm);
      showSuccess('Word added');
      setWordDialogOpen(false);
      setWordForm({
        word: '',
        definition: '',
        pronunciation: '',
        part_of_speech: '',
        example_sentence: '',
        origin: '',
        synonyms: [],
        antonyms: [],
        category: '',
      });
      loadData();
    } catch (error) {
      showError('Failed to add word');
    }
  };

  const handleDeleteWord = async (id: string) => {
    try {
      await deleteWord(id);
      showSuccess('Word deleted');
      loadData();
    } catch (error) {
      showError('Failed to delete word');
    }
  };

  const startReview = async () => {
    try {
      const res = await getWordsForReview(10);
      setReviewWords(res.data);
      setReviewIndex(0);
      setShowDefinition(false);
      setReviewMode(true);
    } catch (error) {
      showError('Failed to start review');
    }
  };

  const handleReviewAnswer = async (correct: boolean) => {
    try {
      const currentWord = reviewWords[reviewIndex];
      await reviewWord(currentWord.id, correct);
      
      if (reviewIndex < reviewWords.length - 1) {
        setReviewIndex(reviewIndex + 1);
        setShowDefinition(false);
      } else {
        setReviewMode(false);
        showSuccess('Review complete!');
        loadData();
      }
    } catch (error) {
      showError('Failed to record answer');
    }
  };

  const addSynonym = () => {
    if (synonymInput.trim() && !wordForm.synonyms.includes(synonymInput.trim())) {
      setWordForm({ ...wordForm, synonyms: [...wordForm.synonyms, synonymInput.trim()] });
      setSynonymInput('');
    }
  };

  const addAntonym = () => {
    if (antonymInput.trim() && !wordForm.antonyms.includes(antonymInput.trim())) {
      setWordForm({ ...wordForm, antonyms: [...wordForm.antonyms, antonymInput.trim()] });
      setAntonymInput('');
    }
  };

  // Sticky note handlers
  const handleSaveStickyNote = async () => {
    try {
      await createStickyNote(stickyForm);
      showSuccess('Note added');
      setStickyDialogOpen(false);
      setStickyForm({ content: '', color: '#fef3c7' });
      loadData();
    } catch (error) {
      showError('Failed to add note');
    }
  };

  const handleDeleteStickyNote = async (id: string) => {
    try {
      await deleteStickyNote(id);
      showSuccess('Note deleted');
      loadData();
    } catch (error) {
      showError('Failed to delete note');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography align="center" sx={{ mt: 2 }}>Loading Utilities...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h4" fontWeight="bold">Utilities</Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Quotes, vocabulary, and quick notes
            </Typography>
          </Box>
          <IconButton onClick={loadData}>
            <Refresh />
          </IconButton>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
          <Tab icon={<FormatQuote fontSize="small" />} label="Quotes" iconPosition="start" />
          <Tab icon={<Spellcheck fontSize="small" />} label="Vocabulary" iconPosition="start" />
          <Tab icon={<StickyNote2 fontSize="small" />} label="Sticky Notes" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Quotes Tab */}
      {activeTab === 0 && (
        <>
          {/* Random Quote Card */}
          {randomQuote && (
            <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent sx={{ p: 3 }}>
                <FormatQuote sx={{ fontSize: 40, opacity: 0.5, mb: 1 }} />
                <Typography variant="h5" sx={{ fontStyle: 'italic', mb: 2 }}>
                  "{randomQuote.content}"
                </Typography>
                {randomQuote.author && (
                  <Typography variant="subtitle1">— {randomQuote.author}</Typography>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2, color: 'white', borderColor: 'white' }}
                  onClick={handleNewRandomQuote}
                >
                  New Quote
                </Button>
              </CardContent>
            </Card>
          )}

          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setQuoteDialogOpen(true)}
            >
              Add Quote
            </Button>
          </Stack>

          <Grid container spacing={2}>
            {quotes.map((quote) => (
              <Grid item xs={12} sm={6} md={4} key={quote.id}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between">
                        {quote.category && (
                          <Chip size="small" label={quote.category} variant="outlined" />
                        )}
                        <Stack direction="row">
                          <Tooltip title={quote.is_favorite ? 'Unfavorite' : 'Favorite'}>
                            <IconButton
                              size="small"
                              onClick={() => handleToggleQuoteFavorite(quote.id)}
                            >
                              <Favorite
                                fontSize="small"
                                color={quote.is_favorite ? 'error' : 'disabled'}
                              />
                            </IconButton>
                          </Tooltip>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteQuote(quote.id)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Stack>

                      <Typography variant="body1" sx={{ fontStyle: 'italic' }}>
                        "{quote.content}"
                      </Typography>

                      {quote.author && (
                        <Typography variant="caption" color="text.secondary">
                          — {quote.author}
                        </Typography>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {quotes.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <FormatQuote sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No quotes yet
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {/* Vocabulary Tab */}
      {activeTab === 1 && (
        <>
          {/* Stats */}
          {wordStats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Card sx={{ backgroundColor: 'primary.main', color: 'white' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="h4">{wordStats.total}</Typography>
                    <Typography variant="body2">Total Words</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ backgroundColor: 'success.main', color: 'white' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="h4">{wordStats.learned}</Typography>
                    <Typography variant="body2">Learned</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ backgroundColor: 'warning.main', color: 'white' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="h4">{wordStats.progress}%</Typography>
                    <Typography variant="body2">Progress</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card sx={{ backgroundColor: 'info.main', color: 'white' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Typography variant="h4">{wordStats.reviewedToday}</Typography>
                    <Typography variant="body2">Reviewed Today</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Review Mode */}
          {reviewMode && reviewWords.length > 0 && (
            <Card sx={{ mb: 3, p: 3 }}>
              <Stack spacing={3} alignItems="center">
                <Typography variant="caption">
                  {reviewIndex + 1} / {reviewWords.length}
                </Typography>
                <Typography variant="h3" fontWeight="bold">
                  {reviewWords[reviewIndex].word}
                </Typography>
                {reviewWords[reviewIndex].pronunciation && (
                  <Typography variant="subtitle1" color="text.secondary">
                    {reviewWords[reviewIndex].pronunciation}
                  </Typography>
                )}

                {showDefinition ? (
                  <>
                    <Typography variant="h6" align="center">
                      {reviewWords[reviewIndex].definition}
                    </Typography>
                    {reviewWords[reviewIndex].example_sentence && (
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        "{reviewWords[reviewIndex].example_sentence}"
                      </Typography>
                    )}
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        color="error"
                        onClick={() => handleReviewAnswer(false)}
                      >
                        Didn't Know
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => handleReviewAnswer(true)}
                      >
                        Knew It
                      </Button>
                    </Stack>
                  </>
                ) : (
                  <Button variant="contained" onClick={() => setShowDefinition(true)}>
                    Show Definition
                  </Button>
                )}

                <Button variant="outlined" onClick={() => setReviewMode(false)}>
                  Exit Review
                </Button>
              </Stack>
            </Card>
          )}

          {!reviewMode && (
            <>
              <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mb: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<School />}
                  onClick={startReview}
                  disabled={words.length === 0}
                >
                  Start Review
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setWordDialogOpen(true)}
                >
                  Add Word
                </Button>
              </Stack>

              <Grid container spacing={2}>
                {words.map((word) => (
                  <Grid item xs={12} sm={6} md={4} key={word.id}>
                    <Card variant="outlined" sx={{ height: '100%' }}>
                      <CardContent>
                        <Stack spacing={1}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="h6">{word.word}</Typography>
                              {word.is_learned && (
                                <CheckCircle fontSize="small" color="success" />
                              )}
                            </Stack>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteWord(word.id)}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Stack>

                          {word.pronunciation && (
                            <Typography variant="caption" color="text.secondary">
                              {word.pronunciation}
                            </Typography>
                          )}

                          {word.part_of_speech && (
                            <Chip size="small" label={word.part_of_speech} variant="outlined" />
                          )}

                          <Typography variant="body2">{word.definition}</Typography>

                          {word.example_sentence && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              "{word.example_sentence}"
                            </Typography>
                          )}

                          <Typography variant="caption" color="text.secondary">
                            Reviewed {word.review_count} times
                          </Typography>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                {words.length === 0 && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 4, textAlign: 'center' }}>
                      <Spellcheck sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                        No words yet
                      </Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </>
          )}
        </>
      )}

      {/* Sticky Notes Tab */}
      {activeTab === 2 && (
        <>
          <Stack direction="row" justifyContent="flex-end" sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setStickyDialogOpen(true)}
            >
              Add Note
            </Button>
          </Stack>

          <Grid container spacing={2}>
            {stickyNotes.map((note) => (
              <Grid item xs={6} sm={4} md={3} key={note.id}>
                <Card
                  sx={{
                    height: 200,
                    backgroundColor: note.color || '#fef3c7',
                    position: 'relative',
                  }}
                >
                  <CardContent sx={{ height: '100%' }}>
                    <IconButton
                      size="small"
                      sx={{ position: 'absolute', top: 4, right: 4 }}
                      onClick={() => handleDeleteStickyNote(note.id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                    <Typography
                      variant="body2"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 7,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {note.content}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {stickyNotes.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <StickyNote2 sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No sticky notes yet
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </>
      )}

      {/* Quote Dialog */}
      <Dialog open={quoteDialogOpen} onClose={() => setQuoteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Quote</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Quote"
              value={quoteForm.content}
              onChange={(e) => setQuoteForm({ ...quoteForm, content: e.target.value })}
              fullWidth
              multiline
              rows={3}
              autoFocus
            />
            <TextField
              label="Author"
              value={quoteForm.author}
              onChange={(e) => setQuoteForm({ ...quoteForm, author: e.target.value })}
              fullWidth
            />
            <TextField
              label="Source"
              value={quoteForm.source}
              onChange={(e) => setQuoteForm({ ...quoteForm, source: e.target.value })}
              fullWidth
            />
            <TextField
              label="Category"
              value={quoteForm.category}
              onChange={(e) => setQuoteForm({ ...quoteForm, category: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuoteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveQuote} variant="contained" disabled={!quoteForm.content.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Word Dialog */}
      <Dialog open={wordDialogOpen} onClose={() => setWordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Word</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Word"
              value={wordForm.word}
              onChange={(e) => setWordForm({ ...wordForm, word: e.target.value })}
              fullWidth
              autoFocus
            />
            <TextField
              label="Definition"
              value={wordForm.definition}
              onChange={(e) => setWordForm({ ...wordForm, definition: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Pronunciation"
                value={wordForm.pronunciation}
                onChange={(e) => setWordForm({ ...wordForm, pronunciation: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Part of Speech</InputLabel>
                <Select
                  value={wordForm.part_of_speech}
                  label="Part of Speech"
                  onChange={(e) => setWordForm({ ...wordForm, part_of_speech: e.target.value })}
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="noun">Noun</MenuItem>
                  <MenuItem value="verb">Verb</MenuItem>
                  <MenuItem value="adjective">Adjective</MenuItem>
                  <MenuItem value="adverb">Adverb</MenuItem>
                  <MenuItem value="pronoun">Pronoun</MenuItem>
                  <MenuItem value="preposition">Preposition</MenuItem>
                  <MenuItem value="conjunction">Conjunction</MenuItem>
                  <MenuItem value="interjection">Interjection</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Example Sentence"
              value={wordForm.example_sentence}
              onChange={(e) => setWordForm({ ...wordForm, example_sentence: e.target.value })}
              fullWidth
            />
            <TextField
              label="Origin"
              value={wordForm.origin}
              onChange={(e) => setWordForm({ ...wordForm, origin: e.target.value })}
              fullWidth
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Synonyms</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  value={synonymInput}
                  onChange={(e) => setSynonymInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addSynonym()}
                />
                <Button size="small" onClick={addSynonym}>Add</Button>
              </Stack>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
                {wordForm.synonyms.map((syn) => (
                  <Chip
                    key={syn}
                    label={syn}
                    size="small"
                    onDelete={() => setWordForm({ ...wordForm, synonyms: wordForm.synonyms.filter((s) => s !== syn) })}
                  />
                ))}
              </Stack>
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Antonyms</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  value={antonymInput}
                  onChange={(e) => setAntonymInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addAntonym()}
                />
                <Button size="small" onClick={addAntonym}>Add</Button>
              </Stack>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
                {wordForm.antonyms.map((ant) => (
                  <Chip
                    key={ant}
                    label={ant}
                    size="small"
                    onDelete={() => setWordForm({ ...wordForm, antonyms: wordForm.antonyms.filter((a) => a !== ant) })}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWordDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveWord} variant="contained" disabled={!wordForm.word.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Sticky Note Dialog */}
      <Dialog open={stickyDialogOpen} onClose={() => setStickyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Sticky Note</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Note"
              value={stickyForm.content}
              onChange={(e) => setStickyForm({ ...stickyForm, content: e.target.value })}
              fullWidth
              multiline
              rows={4}
              autoFocus
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Color</Typography>
              <Stack direction="row" spacing={1}>
                {STICKY_COLORS.map((color) => (
                  <Box
                    key={color}
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: color,
                      borderRadius: 1,
                      cursor: 'pointer',
                      border: stickyForm.color === color ? '3px solid #333' : '1px solid #ccc',
                    }}
                    onClick={() => setStickyForm({ ...stickyForm, color })}
                  />
                ))}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStickyDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveStickyNote} variant="contained" disabled={!stickyForm.content.trim()}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Utilities;
