import { clx, IconButton, Kbd, Tooltip } from "@medusajs/ui";
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBold,
  IconH2,
  IconItalic,
  IconList,
  IconListNumbers,
  IconQuote,
} from "@tabler/icons-react";
import Placeholder from "@tiptap/extension-placeholder";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import { useCallback, useEffect, useMemo, useState } from "react";

interface TipTapEditorProps {
  value: string;
  initialValue?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  format?: "html" | "markdown";
}

interface ToolbarButton {
  id: string;
  label?: string;
  title?: string;
  isActive?: boolean;
  isDisabled?: boolean;
  onClick?: () => void;
  isSeparator?: boolean;
  icon?: React.ReactNode;
  shortcut?: string;
}

interface EditorState {
  isBold: boolean;
  isItalic: boolean;
  isHeading: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  isBlockquote: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

export function TipTapEditor({
  value,
  initialValue,
  onChange,
  placeholder,
  className,
  format = "markdown",
}: TipTapEditorProps) {
  const [editorState, setEditorState] = useState<EditorState>({
    isBold: false,
    isItalic: false,
    isHeading: false,
    isBulletList: false,
    isOrderedList: false,
    isBlockquote: false,
    canUndo: false,
    canRedo: false,
  });

  // Helper function to update editor state
  // Must be defined before useEditor: Placeholder extension can dispatch
  // synchronously during editor init, firing onUpdate before a later const would be initialized.
  const updateEditorState = useCallback((editor: Editor | null) => {
    if (!editor) return;

    setEditorState({
      isBold: editor.isActive("bold"),
      isItalic: editor.isActive("italic"),
      isHeading: editor.isActive("heading", { level: 2 }),
      isBulletList: editor.isActive("bulletList"),
      isOrderedList: editor.isActive("orderedList"),
      isBlockquote: editor.isActive("blockquote"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    });
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      ...(format === "markdown" ? [Markdown] : []),
      Placeholder.configure({
        placeholder: placeholder || "",
        showOnlyWhenEditable: true,
        showOnlyCurrent: false,
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const output =
        format === "markdown"
          ? editor.storage.markdown.getMarkdown()
          : editor.getHTML();
      onChange(output);
      updateEditorState(editor);
    },
    onSelectionUpdate: ({ editor }) => {
      updateEditorState(editor);
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none",
      },
    },
  });

  const handleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run();
  }, [editor]);

  const handleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run();
  }, [editor]);

  const handleHeading = useCallback(() => {
    editor?.chain().focus().toggleHeading({ level: 2 }).run();
  }, [editor]);

  const handleBulletList = useCallback(() => {
    editor?.chain().focus().toggleBulletList().run();
  }, [editor]);

  const handleOrderedList = useCallback(() => {
    editor?.chain().focus().toggleOrderedList().run();
  }, [editor]);

  const handleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run();
  }, [editor]);

  const handleUndo = useCallback(() => {
    editor?.chain().focus().undo().run();
  }, [editor]);

  const handleRedo = useCallback(() => {
    editor?.chain().focus().redo().run();
  }, [editor]);

  // Update editor state when editor is ready
  useEffect(() => {
    if (editor) {
      updateEditorState(editor);
    }
  }, [editor, updateEditorState]);

  // Synchronize editor content with value prop changes
  useEffect(() => {
    if (!editor) return;
    const current =
      format === "markdown"
        ? editor.storage.markdown.getMarkdown()
        : editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value);
    }
  }, [editor, value, format]);

  const toolbarButtons = useMemo((): ToolbarButton[] => {
    if (!editor) return [];

    return [
      {
        id: "bold",
        icon: <IconBold size={18} />,
        title: "Bold",
        shortcut: "Ctrl+B",
        isActive: editorState.isBold,
        onClick: handleBold,
      },
      {
        id: "italic",
        icon: <IconItalic size={18} />,
        title: "Italic",
        shortcut: "Ctrl+I",
        isActive: editorState.isItalic,
        onClick: handleItalic,
      },
      {
        id: "heading",
        icon: <IconH2 size={18} />,
        title: "Heading 2",
        isActive: editorState.isHeading,
        onClick: handleHeading,
      },
      { id: "separator1", isSeparator: true },
      {
        id: "bulletList",
        icon: <IconList size={18} />,
        title: "Bullet List",
        isActive: editorState.isBulletList,
        onClick: handleBulletList,
      },
      {
        id: "orderedList",
        icon: <IconListNumbers size={18} />,
        title: "Numbered List",
        isActive: editorState.isOrderedList,
        onClick: handleOrderedList,
      },
      {
        id: "blockquote",
        icon: <IconQuote size={18} />,
        title: "Quote",
        isActive: editorState.isBlockquote,
        onClick: handleBlockquote,
      },
      { id: "separator2", isSeparator: true },
      {
        id: "undo",
        icon: <IconArrowBackUp size={18} />,
        title: "Undo",
        shortcut: "Ctrl+Z",
        isActive: false,
        isDisabled: !editorState.canUndo,
        onClick: handleUndo,
      },
      {
        id: "redo",
        icon: <IconArrowForwardUp size={18} />,
        title: "Redo",
        shortcut: "Ctrl+Y",
        isActive: false,
        isDisabled: !editorState.canRedo,
        onClick: handleRedo,
      },
    ];
  }, [
    editor,
    editorState,
    handleBold,
    handleItalic,
    handleHeading,
    handleBulletList,
    handleOrderedList,
    handleBlockquote,
    handleUndo,
    handleRedo,
  ]);

  const renderToolbarButton = useCallback((button: ToolbarButton) => {
    if (button.isSeparator) {
      return (
        <div key={button.id} className="w-px h-4 bg-ui-border-base mx-1" />
      );
    }

    return (
      <Tooltip
        delayDuration={2000}
        content={
          <div className="flex items-center gap-1">
            {button.title}
            {button.shortcut && (
              <span className="text-xs text-ui-text-secondary">
                <Kbd>{button.shortcut}</Kbd>
              </span>
            )}
          </div>
        }
        key={button.id}
      >
        <IconButton
          key={button.id}
          type="button"
          variant={button.isActive ? "primary" : "transparent"}
          size="small"
          onClick={button.onClick}
          disabled={button.isDisabled}
          title={button.title}
        >
          {button.icon}
        </IconButton>
      </Tooltip>
    );
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div className={clx("border rounded-md overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-ui-bg-field/20 focus:outline-none">
        {toolbarButtons.map(renderToolbarButton)}
      </div>

      {/* Editor Content */}
      <div className="relative">
        <EditorContent
          editor={editor}
          className="min-h-[120px] p-3 focus:outline-none prose prose-sm max-w-none caret-ui-fg-base bg-ui-bg-field hover:bg-ui-bg-field-hover shadow-borders-base placeholder-ui-fg-muted text-ui-fg-base transition-fg relative appearance-none rounded-md outline-none focus-visible:shadow-borders-interactive-with-active disabled:text-ui-fg-disabled disabled:!bg-ui-bg-disabled disabled:placeholder-ui-fg-disabled disabled:cursor-not-allowed aria-[invalid=true]:!shadow-borders-error invalid:!shadow-borders-error [&::--webkit-search-cancel-button]:hidden [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden txt-compact-small [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
        />
        {/* Placeholder is now handled by the Tiptap Placeholder extension */}
      </div>
    </div>
  );
}
