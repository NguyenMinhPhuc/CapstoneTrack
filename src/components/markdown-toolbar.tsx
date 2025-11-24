"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Link as LinkIcon,
  Code,
} from "lucide-react";

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onChange: (value: string) => void;
}

export function MarkdownToolbar({
  textareaRef,
  onChange,
}: MarkdownToolbarProps) {
  const applyStyle = (
    style:
      | "bold"
      | "italic"
      | "bullet"
      | "number"
      | "h1"
      | "h2"
      | "link"
      | "codeblock"
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selectedText = value.substring(start, end);

    let prefix = "";
    let suffix = "";
    let newText = "";

    switch (style) {
      case "bold":
        prefix = "**";
        suffix = "**";
        newText = `${prefix}${selectedText}${suffix}`;
        break;
      case "italic":
        prefix = "*";
        suffix = "*";
        newText = `${prefix}${selectedText}${suffix}`;
        break;
      case "bullet":
        const lines = selectedText.split("\n");
        if (lines.length > 1 && selectedText) {
          newText = lines
            .map((line) => (line.trim() ? `- ${line}` : line))
            .join("\n");
        } else {
          const lineStart = value.lastIndexOf("\n", start - 1) + 1;
          const currentLinePrefix = value.substring(lineStart, start);
          prefix = currentLinePrefix.trim().length > 0 ? "\n- " : "- ";
          newText = `${prefix}${selectedText}`;
        }
        break;
      case "number":
        const linesNum = selectedText.split("\n");
        if (linesNum.length > 1 && selectedText) {
          newText = linesNum
            .map((line, index) =>
              line.trim() ? `${index + 1}. ${line}` : line
            )
            .join("\n");
        } else {
          const lineStart = value.lastIndexOf("\n", start - 1) + 1;
          const currentLinePrefix = value.substring(lineStart, start);
          prefix = currentLinePrefix.trim().length > 0 ? "\n1. " : "1. ";
          newText = `${prefix}${selectedText}`;
        }
        break;
      case "h1": {
        const linesH1 = selectedText ? selectedText.split("\n") : [""];
        if (selectedText && linesH1.length > 1) {
          newText = linesH1.map((l) => (l.trim() ? `# ${l}` : l)).join("\n");
        } else {
          const lineStart = value.lastIndexOf("\n", start - 1) + 1;
          const currentLine = value.substring(lineStart, end);
          if (!selectedText) {
            prefix = currentLine.trim().length ? "\n# " : "# ";
            newText = `${prefix}`;
          } else {
            newText = `# ${selectedText}`;
          }
        }
        break;
      }
      case "h2": {
        const linesH2 = selectedText ? selectedText.split("\n") : [""];
        if (selectedText && linesH2.length > 1) {
          newText = linesH2.map((l) => (l.trim() ? `## ${l}` : l)).join("\n");
        } else {
          const lineStart = value.lastIndexOf("\n", start - 1) + 1;
          const currentLine = value.substring(lineStart, end);
          if (!selectedText) {
            prefix = currentLine.trim().length ? "\n## " : "## ";
            newText = `${prefix}`;
          } else {
            newText = `## ${selectedText}`;
          }
        }
        break;
      }
      case "link": {
        const text = selectedText || "text";
        const urlPlaceholder = "https://";
        newText = `[${text}](${urlPlaceholder})`;
        // After insertion we'll position cursor inside URL placeholder.
        suffix = ")"; // for selection math later
        break;
      }
      case "codeblock": {
        if (selectedText && selectedText.includes("\n")) {
          newText = `\n\n\`\`\`\n${selectedText}\n\`\`\`\n`;
        } else if (selectedText) {
          newText = `\`${selectedText}\``; // inline code
        } else {
          newText = `\n\n\`\`\`\n// code here\n\`\`\`\n`;
        }
        break;
      }
    }

    const newValue = value.substring(0, start) + newText + value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      if (!textarea) return;
      textarea.focus();
      if (style === "link") {
        // Place cursor inside URL placeholder
        const linkStart = start + newText.indexOf("(") + 1;
        const linkEnd = linkStart + "https://".length;
        textarea.selectionStart = linkStart;
        textarea.selectionEnd = linkEnd;
        return;
      }
      if (style === "codeblock" && newText.includes("// code here")) {
        const codePos = newValue.indexOf("// code here");
        if (codePos !== -1) {
          textarea.selectionStart = codePos;
          textarea.selectionEnd = codePos + "// code here".length;
          return;
        }
      }
      if (selectedText) {
        textarea.selectionStart = start + newText.length;
        textarea.selectionEnd = start + newText.length;
      } else {
        textarea.selectionStart = start + (prefix ? prefix.length : 0);
        textarea.selectionEnd = start + (prefix ? prefix.length : 0);
      }
    }, 0);
  };

  return (
    <div className="flex items-center gap-1 rounded-t-md border border-b-0 border-input bg-transparent p-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onMouseDown={(e) => {
          e.preventDefault();
          applyStyle("bold");
        }}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onMouseDown={(e) => {
          e.preventDefault();
          applyStyle("italic");
        }}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onMouseDown={(e) => {
          e.preventDefault();
          applyStyle("bullet");
        }}
        title="Bullet list"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onMouseDown={(e) => {
          e.preventDefault();
          applyStyle("number");
        }}
        title="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onMouseDown={(e) => {
          e.preventDefault();
          applyStyle("h1");
        }}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onMouseDown={(e) => {
          e.preventDefault();
          applyStyle("h2");
        }}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onMouseDown={(e) => {
          e.preventDefault();
          applyStyle("link");
        }}
        title="Link"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-7 w-7"
        onMouseDown={(e) => {
          e.preventDefault();
          applyStyle("codeblock");
        }}
        title="Code / Code block"
      >
        <Code className="h-4 w-4" />
      </Button>
    </div>
  );
}
