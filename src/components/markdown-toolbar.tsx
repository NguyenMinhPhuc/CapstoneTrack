
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onChange: (...event: any[]) => void;
}

export function MarkdownToolbar({ textareaRef, onChange }: MarkdownToolbarProps) {
  const applyStyle = (style: 'bold' | 'italic' | 'bullet' | 'number') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selectedText = value.substring(start, end);
    
    let replacement = '';
    let cursorOffset = 0;

    switch (style) {
      case 'bold':
        replacement = `**${selectedText}**`;
        cursorOffset = 2;
        break;
      case 'italic':
        replacement = `*${selectedText}*`;
        cursorOffset = 1;
        break;
      case 'bullet':
        {
          const lines = selectedText.split('\n');
          if (lines.length > 1 && selectedText) {
            replacement = lines.map(line => line.trim() ? `- ${line}` : line).join('\n');
          } else {
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const prefix = value.substring(lineStart, start).trim().length === 0 ? '' : '\n';
            replacement = `${prefix}- ${selectedText}`;
          }
        }
        break;
      case 'number':
        {
           const lines = selectedText.split('\n');
           if (lines.length > 1 && selectedText) {
             replacement = lines.map((line, index) => line.trim() ? `${index + 1}. ${line}` : line).join('\n');
           } else {
             const lineStart = value.lastIndexOf('\n', start - 1) + 1;
             const prefix = value.substring(lineStart, start).trim().length === 0 ? '' : '\n';
             replacement = `${prefix}1. ${selectedText}`;
           }
        }
        break;
      default:
        break;
    }
    
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    textarea.focus();
    setTimeout(() => {
        if (selectedText) {
            textarea.selectionStart = start + replacement.length;
            textarea.selectionEnd = start + replacement.length;
        } else {
            const newCursorPos = start + cursorOffset;
            textarea.selectionStart = newCursorPos;
            textarea.selectionEnd = newCursorPos;
        }
    }, 0);
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
