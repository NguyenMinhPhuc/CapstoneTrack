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
    const value = textarea.value;
    const selectedText = value.substring(start, end);
    
    let prefix = '';
    let suffix = '';
    let newText = '';

    switch (style) {
      case 'bold':
        prefix = '**';
        suffix = '**';
        newText = `${prefix}${selectedText}${suffix}`;
        break;
      case 'italic':
        prefix = '*';
        suffix = '*';
        newText = `${prefix}${selectedText}${suffix}`;
        break;
      case 'bullet':
        const lines = selectedText.split('\n');
        if (lines.length > 1 && selectedText) {
          newText = lines.map(line => line.trim() ? `- ${line}` : line).join('\n');
        } else {
            const lineStart = value.lastIndexOf('\n', start - 1) + 1;
            const currentLinePrefix = value.substring(lineStart, start);
            prefix = currentLinePrefix.trim().length > 0 ? '\n- ' : '- ';
            newText = `${prefix}${selectedText}`;
        }
        break;
      case 'number':
           const linesNum = selectedText.split('\n');
           if (linesNum.length > 1 && selectedText) {
             newText = linesNum.map((line, index) => line.trim() ? `${index + 1}. ${line}` : line).join('\n');
           } else {
             const lineStart = value.lastIndexOf('\n', start - 1) + 1;
             const currentLinePrefix = value.substring(lineStart, start);
              prefix = currentLinePrefix.trim().length > 0 ? '\n1. ' : '1. ';
              newText = `${prefix}${selectedText}`;
           }
        break;
    }

    const newValue = value.substring(0, start) + newText + value.substring(end);
    
    // Natively set the value and dispatch an input event
    const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;
    nativeTextareaValueSetter?.call(textarea, newValue);

    const event = new Event('input', { bubbles: true });
    textarea.dispatchEvent(event);


    // After updating the value, we need to manually set the selection
    setTimeout(() => {
        if (!textarea) return;
        textarea.focus();
        if (selectedText) {
             textarea.selectionStart = start + newText.length;
             textarea.selectionEnd = start + newText.length;
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
