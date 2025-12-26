/**
 * @fileoverview Slash Command Plugin for Lexical Editor
 * 
 * Provides a Notion-like slash command menu for inserting blocks.
 * Type "/" to trigger the command menu with context-aware suggestions.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  LexicalEditor,
  COMMAND_PRIORITY_LOW,
  TextNode,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
} from 'lexical';
import { $createHeadingNode, HeadingTagType } from '@lexical/rich-text';
import { $createListNode, $createListItemNode } from '@lexical/list';
import { $createCodeNode } from '@lexical/code';
import { v4 as uuidv4 } from 'uuid';
import {
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from '@mui/material';
import {
  Title as TitleIcon,
  FormatListBulleted as ListIcon,
  FormatListNumbered as NumberedListIcon,
  Code as CodeIcon,
  CheckBox as CheckBoxIcon,
  ViewKanban as KanbanIcon,
  TableChart as TableIcon,
  Psychology as AIIcon,
  Image as ImageIcon,
  FormatQuote as QuoteIcon,
} from '@mui/icons-material';
import { TodoNode } from '../nodes/BlockNodes';
import './SlashCommandPlugin.css';

/**
 * Command definition
 */
export interface SlashCommand {
  key: string;
  label: string;
  description: string;
  icon: React.ReactElement;
  keywords: string[];
  category: 'text' | 'structure' | 'media' | 'kanban' | 'database' | 'ai';
  onSelect: (editor: LexicalEditor) => void;
}

/**
 * Get all available slash commands
 */
export function getSlashCommands(): SlashCommand[] {
  return [
    // Text blocks
    {
      key: 'h1',
      label: 'Heading 1',
      description: 'Large section heading',
      icon: <TitleIcon />,
      keywords: ['h1', 'heading', 'title', 'large'],
      category: 'text',
      onSelect: (editor) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const heading = $createHeadingNode('h1' as HeadingTagType);
            selection.insertNodes([heading]);
          }
        });
      },
    },
    {
      key: 'h2',
      label: 'Heading 2',
      description: 'Medium section heading',
      icon: <TitleIcon />,
      keywords: ['h2', 'heading', 'subtitle'],
      category: 'text',
      onSelect: (editor) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const heading = $createHeadingNode('h2' as HeadingTagType);
            selection.insertNodes([heading]);
          }
        });
      },
    },
    {
      key: 'h3',
      label: 'Heading 3',
      description: 'Small section heading',
      icon: <TitleIcon />,
      keywords: ['h3', 'heading', 'subheading'],
      category: 'text',
      onSelect: (editor) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const heading = $createHeadingNode('h3' as HeadingTagType);
            selection.insertNodes([heading]);
          }
        });
      },
    },
    {
      key: 'bulleted-list',
      label: 'Bulleted List',
      description: 'Create a bulleted list',
      icon: <ListIcon />,
      keywords: ['ul', 'list', 'bullet', 'unordered'],
      category: 'text',
      onSelect: (editor) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const list = $createListNode('bullet');
            const listItem = $createListItemNode();
            list.append(listItem);
            selection.insertNodes([list]);
          }
        });
      },
    },
    {
      key: 'numbered-list',
      label: 'Numbered List',
      description: 'Create a numbered list',
      icon: <NumberedListIcon />,
      keywords: ['ol', 'list', 'number', 'ordered'],
      category: 'text',
      onSelect: (editor) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const list = $createListNode('number');
            const listItem = $createListItemNode();
            list.append(listItem);
            selection.insertNodes([list]);
          }
        });
      },
    },
    {
      key: 'todo',
      label: 'To-do List',
      description: 'Track tasks with a checkbox',
      icon: <CheckBoxIcon />,
      keywords: ['todo', 'task', 'checkbox', 'check'],
      category: 'text',
      onSelect: (editor) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const todo = new TodoNode(uuidv4(), '', false);
            selection.insertNodes([todo]);
          }
        });
      },
    },
    {
      key: 'code',
      label: 'Code Block',
      description: 'Capture a code snippet',
      icon: <CodeIcon />,
      keywords: ['code', 'snippet', 'programming'],
      category: 'text',
      onSelect: (editor) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            const code = $createCodeNode();
            selection.insertNodes([code]);
          }
        });
      },
    },
    {
      key: 'quote',
      label: 'Quote',
      description: 'Capture a quote',
      icon: <QuoteIcon />,
      keywords: ['quote', 'blockquote', 'citation'],
      category: 'text',
      onSelect: (editor) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            // Use paragraph for now, will add QuoteNode later
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(''));
            selection.insertNodes([paragraph]);
          }
        });
      },
    },
    
    // Structure blocks
    {
      key: 'page',
      label: 'Page',
      description: 'Create a new page',
      icon: <TitleIcon />,
      keywords: ['page', 'document', 'new'],
      category: 'structure',
      onSelect: (editor) => {
        // TODO: Implement page creation
        console.log('Create new page');
      },
    },
    
    // Kanban blocks
    {
      key: 'kanban',
      label: 'Kanban Board',
      description: 'Visualize tasks in columns',
      icon: <KanbanIcon />,
      keywords: ['kanban', 'board', 'tasks', 'columns'],
      category: 'kanban',
      onSelect: (editor) => {
        // TODO: Implement Kanban board creation
        console.log('Create Kanban board');
      },
    },
    
    // Database blocks
    {
      key: 'table',
      label: 'Table',
      description: 'Add a simple table',
      icon: <TableIcon />,
      keywords: ['table', 'spreadsheet', 'grid'],
      category: 'database',
      onSelect: (editor) => {
        // TODO: Implement table creation
        console.log('Create table');
      },
    },
    {
      key: 'database',
      label: 'Database',
      description: 'Create a database',
      icon: <TableIcon />,
      keywords: ['database', 'collection', 'data'],
      category: 'database',
      onSelect: (editor) => {
        // TODO: Implement database creation
        console.log('Create database');
      },
    },
    
    // Media blocks
    {
      key: 'image',
      label: 'Image',
      description: 'Upload or embed an image',
      icon: <ImageIcon />,
      keywords: ['image', 'picture', 'photo', 'upload'],
      category: 'media',
      onSelect: (editor) => {
        // TODO: Implement image upload
        console.log('Upload image');
      },
    },
    
    // AI blocks
    {
      key: 'ai',
      label: 'AI Block',
      description: 'Generate content with AI',
      icon: <AIIcon />,
      keywords: ['ai', 'generate', 'assistant', 'gpt'],
      category: 'ai',
      onSelect: (editor) => {
        // TODO: Implement AI block
        console.log('Create AI block');
      },
    },
  ];
}

/**
 * Filter commands based on query
 */
function filterCommands(commands: SlashCommand[], query: string): SlashCommand[] {
  if (!query) return commands;
  
  const lowerQuery = query.toLowerCase();
  
  return commands.filter(cmd => 
    cmd.label.toLowerCase().includes(lowerQuery) ||
    cmd.description.toLowerCase().includes(lowerQuery) ||
    cmd.keywords.some(kw => kw.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Slash Command Menu Component
 */
interface SlashCommandMenuProps {
  query: string;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
  anchorPosition: { top: number; left: number } | null;
}

function SlashCommandMenu({
  query,
  onSelect,
  onClose,
  anchorPosition,
}: SlashCommandMenuProps) {
  const allCommands = getSlashCommands();
  const [filteredCommands, setFilteredCommands] = useState<SlashCommand[]>(allCommands);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Filter commands when query changes
  useEffect(() => {
    const filtered = filterCommands(allCommands, query);
    setFilteredCommands(filtered);
    setSelectedIndex(0);
  }, [query]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, onSelect, onClose]);
  
  // Scroll selected item into view
  useEffect(() => {
    if (menuRef.current) {
      const selectedElement = menuRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      ) as HTMLElement;
      
      if (selectedElement) {
        selectedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [selectedIndex]);
  
  if (!anchorPosition || filteredCommands.length === 0) return null;
  
  return (
    <Paper
      ref={menuRef}
      elevation={8}
      className="slash-command-menu"
      style={{
        position: 'absolute',
        top: anchorPosition.top,
        left: anchorPosition.left,
        maxHeight: '400px',
        overflowY: 'auto',
        minWidth: '320px',
        zIndex: 1000,
      }}
    >
      <Box p={1}>
        <Typography variant="caption" color="textSecondary" sx={{ px: 2, py: 1 }}>
          {query ? `Searching for "${query}"` : 'Select a block type'}
        </Typography>
      </Box>
      
      <List dense>
        {filteredCommands.map((cmd, index) => (
          <ListItem
            key={cmd.key}
            button
            selected={index === selectedIndex}
            data-index={index}
            onClick={() => onSelect(cmd)}
            className={`slash-command-item ${
              index === selectedIndex ? 'selected' : ''
            }`}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {cmd.icon}
            </ListItemIcon>
            <ListItemText
              primary={cmd.label}
              secondary={cmd.description}
              primaryTypographyProps={{
                fontWeight: index === selectedIndex ? 600 : 400,
              }}
            />
          </ListItem>
        ))}
      </List>
      
      {filteredCommands.length === 0 && (
        <Box p={3} textAlign="center">
          <Typography color="textSecondary">
            No blocks found for "{query}"
          </Typography>
        </Box>
      )}
    </Paper>
  );
}

/**
 * Slash Command Plugin
 * 
 * Detects "/" and shows command menu
 */
export function SlashCommandPlugin(): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);
  const [anchorPosition, setAnchorPosition] = useState<{ top: number; left: number } | null>(null);
  
  // Detect "/" character and track query
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        
        if (!$isRangeSelection(selection)) {
          setQueryString(null);
          return;
        }
        
        const node = selection.anchor.getNode();
        if (!(node instanceof TextNode)) {
          setQueryString(null);
          return;
        }
        
        const text = node.getTextContent();
        const offset = selection.anchor.offset;
        
        // Find last "/" before cursor
        let slashIndex = -1;
        for (let i = offset - 1; i >= 0; i--) {
          if (text[i] === '/') {
            slashIndex = i;
            break;
          }
          // Stop if we hit a space (only care about current word)
          if (text[i] === ' ') {
            break;
          }
        }
        
        if (slashIndex >= 0) {
          const query = text.slice(slashIndex + 1, offset);
          setQueryString(query);
          
          // Get position for menu
          const domSelection = window.getSelection();
          if (domSelection && domSelection.rangeCount > 0) {
            const range = domSelection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setAnchorPosition({
              top: rect.bottom + window.scrollY + 5,
              left: rect.left + window.scrollX,
            });
          }
        } else {
          setQueryString(null);
        }
      });
    });
  }, [editor]);
  
  const handleSelect = useCallback((command: SlashCommand) => {
    editor.update(() => {
      const selection = $getSelection();
      
      if (!$isRangeSelection(selection)) return;
      
      const node = selection.anchor.getNode();
      if (!(node instanceof TextNode)) return;
      
      const text = node.getTextContent();
      const offset = selection.anchor.offset;
      
      // Find and remove the "/" and query
      let slashIndex = -1;
      for (let i = offset - 1; i >= 0; i--) {
        if (text[i] === '/') {
          slashIndex = i;
          break;
        }
      }
      
      if (slashIndex >= 0) {
        // Remove the slash command text
        const textNode = node.getWritable();
        const newText = text.slice(0, slashIndex) + text.slice(offset);
        textNode.setTextContent(newText);
        
        // Move cursor to where slash was
        selection.anchor.offset = slashIndex;
        selection.focus.offset = slashIndex;
      }
      
      // Execute command
      command.onSelect(editor);
    });
    
    setQueryString(null);
    setAnchorPosition(null);
  }, [editor]);
  
  const handleClose = useCallback(() => {
    setQueryString(null);
    setAnchorPosition(null);
  }, []);
  
  if (queryString === null) return null;
  
  return (
    <SlashCommandMenu
      query={queryString}
      onSelect={handleSelect}
      onClose={handleClose}
      anchorPosition={anchorPosition}
    />
  );
}

export default SlashCommandPlugin;
