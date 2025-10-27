'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, List, ListOrdered } from 'lucide-react';

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onChange: (value: string) => void;
}

export function MarkdownToolbar({ textareaRef, onChange }: MarkdownToolbarProps) {
  const applyStyle = (style: 'bold' | 'italic' | 'bullet' | 'number') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selectedText = value.substring(start, end);
    
    let prefix = '';
    let suffix = '';
    let replacement = selectedText;

    switch (style) {
      case 'bold':
        prefix = '**';
        suffix = '**';
        break;
      case 'italic':
        prefix = '*';
        suffix = '*';
        break;
      case 'bullet':
        const lines = selectedText.split('\n');
        if (lines.length > 1 && selectedText) {
          replacement = lines.map(line => line.trim() ? `- ${line}` : line).join('\n');
        } else {
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const currentLinePrefix = value.substring(lineStart, start);
            if(currentLinePrefix.trim().length > 0) {
                 prefix = '\n- ';
            } else {
                 prefix = '- ';
            }
        }
        break;
      case 'number':
           const linesNum = selectedText.split('\n');
           if (linesNum.length > 1 && selectedText) {
             replacement = linesNum.map((line, index) => line.trim() ? `${index + 1}. ${line}` : line).join('\n');
           } else {
             const lineStart = value.lastIndexOf('\n', start - 1) + 1;
             const currentLinePrefix = value.substring(lineStart, start);
              if(currentLinePrefix.trim().length > 0) {
                 prefix = '\n1. ';
              } else {
                 prefix = '1. ';
              }
           }
        break;
    }
    
    if (style === 'bold' || style === 'italic') {
        replacement = `${prefix}${selectedText}${suffix}`;
    } else {
        replacement = `${prefix}${selectedText}${suffix}`;
    }

    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    // After updating the value via onChange, we need to manually set the selection
    // in the next render cycle.
    setTimeout(() => {
        if (!textarea) return;
        textarea.focus();
        if (selectedText) {
             textarea.selectionStart = start + replacement.length;
             textarea.selectionEnd = start + replacement.length;
        } else {
            textarea.selectionStart = start + prefix.length;
            textarea.selectionEnd = start + prefix.length;
        }
    }, 0);
  };

  return (
    <div className="flex items-center gap-1 rounded-t-md border border-b-0 border-input bg-transparent p-1">
      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); applyStyle('bold'); }}>
        <Bold className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); applyStyle('italic'); }}>
        <Italic className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); applyStyle('bullet'); }}>
        <List className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline" size="icon" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); applyStyle('number'); }}>
        <ListOrdered className="h-4 w-4" />
      </Button>
    </div>
  );
}
