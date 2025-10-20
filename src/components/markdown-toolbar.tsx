
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

    switch (style) {
      case 'bold':
        newText = `**${selectedText || 'in đậm'}**`;
        break;
      case 'italic':
        newText = `*${selectedText || 'in nghiêng'}*`;
        break;
      case 'bullet': {
        const lines = selectedText.split('\n');
        if (lines.length > 1) {
          newText = lines.map(line => `- ${line}`).join('\n');
        } else {
          newText = `- ${selectedText || 'danh sách'}`;
        }
        break;
      }
      case 'number': {
        const lines = selectedText.split('\n');
         if (lines.length > 1) {
          newText = lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
        } else {
          newText = `1. ${selectedText || 'danh sách'}`;
        }
        break;
      }
      default:
        newText = selectedText;
    }

    const value = textarea.value;
    textarea.value = value.substring(0, start) + newText + value.substring(end);

    // Trigger input event for react-hook-form to update its state
    const event = new Event('input', { bubbles: true });
    textarea.dispatchEvent(event);

    textarea.focus();
    if (selectedText) {
        textarea.setSelectionRange(start + newText.length, start + newText.length);
    } else {
        const newCursorPos = style === 'bold' || style === 'italic' 
            ? start + newText.length - (style === 'bold' ? 2 : 1) 
            : start + newText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
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
