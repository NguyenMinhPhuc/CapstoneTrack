
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function MarkdownToolbar({ textareaRef }: MarkdownToolbarProps) {
  const applyStyle = (style: 'bold' | 'italic' | 'bullet' | 'number') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const value = textarea.value;
    
    let newText = '';
    let newCursorPos = 0;

    const insertText = (text: string, cursorPos: number) => {
      textarea.value = value.substring(0, start) + text + value.substring(end);
      textarea.focus();
      
      // Use setTimeout to ensure the cursor position is set after the value is updated.
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + cursorPos;
        // Dispatch an input event to notify React Hook Form of the change
        const event = new Event('input', { bubbles: true, cancelable: true });
        textarea.dispatchEvent(event);
      }, 0);
    };

    switch (style) {
      case 'bold':
        if (selectedText) {
          newText = `**${selectedText}**`;
          insertText(newText, newText.length);
        } else {
          newText = '****';
          insertText(newText, 2);
        }
        break;
      case 'italic':
        if (selectedText) {
          newText = `*${selectedText}*`;
          insertText(newText, newText.length);
        } else {
          newText = '**';
          insertText(newText, 1);
        }
        break;
      case 'bullet': {
        const lines = selectedText.split('\n');
        if (lines.length > 1 && selectedText) {
           newText = lines.map(line => line.trim() ? `- ${line}` : line).join('\n');
           insertText(newText, newText.length);
        } else {
          const lineStart = value.lastIndexOf('\n', start - 1) + 1;
          const prefix = value.substring(lineStart, start).trim().length === 0 ? '' : '\n';
          newText = `${prefix}- `;
          insertText(newText, newText.length);
        }
        break;
      }
      case 'number': {
        const lines = selectedText.split('\n');
        if (lines.length > 1 && selectedText) {
          newText = lines.map((line, index) => line.trim() ? `${index + 1}. ${line}` : line).join('\n');
          insertText(newText, newText.length);
        } else {
           const lineStart = value.lastIndexOf('\n', start - 1) + 1;
           const prefix = value.substring(lineStart, start).trim().length === 0 ? '' : '\n';
           newText = `${prefix}1. `;
           insertText(newText, newText.length);
        }
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="flex items-center gap-1 rounded-t-md border border-b-0 border-input bg-transparent p-1">
      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => applyStyle('bold')}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => applyStyle('italic')}>
        <Italic className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => applyStyle('bullet')}>
        <List className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => applyStyle('number')}>
        <ListOrdered className="h-4 w-4" />
      </Button>
    </div>
  );
}
