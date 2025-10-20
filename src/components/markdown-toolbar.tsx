
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
    let newText = '';
    let newCursorPos = start;

    switch (style) {
      case 'bold':
        newText = `**${selectedText || 'in đậm'}**`;
        newCursorPos = selectedText ? start + newText.length : start + 2;
        break;
      case 'italic':
        newText = `*${selectedText || 'in nghiêng'}*`;
        newCursorPos = selectedText ? start + newText.length : start + 1;
        break;
      case 'bullet': {
        const lines = selectedText.split('\n');
        if (lines.length > 1) {
          newText = lines.map(line => line.trim() ? `- ${line}` : line).join('\n');
        } else {
          newText = `- ${selectedText || 'danh sách'}`;
        }
        newCursorPos = start + newText.length;
        break;
      }
      case 'number': {
        const lines = selectedText.split('\n');
         if (lines.length > 1) {
          newText = lines.filter(line => line.trim()).map((line, index) => `${index + 1}. ${line}`).join('\n');
        } else {
          newText = `1. ${selectedText || 'danh sách'}`;
        }
        newCursorPos = start + newText.length;
        break;
      }
      default:
        newText = selectedText;
        newCursorPos = end;
    }

    const value = textarea.value;
    const before = value.substring(0, start);
    const after = value.substring(end);

    // This is the key part: update the value programmatically
    textarea.value = before + newText + after;

    // Then, create and dispatch an 'input' event
    // This makes React and react-hook-form aware of the change
    const event = new Event('input', { bubbles: true, cancelable: true });
    textarea.dispatchEvent(event);

    // Set focus and cursor position after the state update
    textarea.focus();
    setTimeout(() => {
        textarea.setSelectionRange(newCursorPos, newCursorPos);
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
