import React from "react";

/**
 * A form that can only be submitted when using the meta or control key.
 */
export const KeyboundForm = React.forwardRef<
  HTMLFormElement,
  React.FormHTMLAttributes<HTMLFormElement>
>(({ onSubmit, onKeyDown, ...rest }, ref) => {
  // Also called from the meta/ctrl+Enter shortcut with the keyboard event;
  // onSubmit handlers only use the shared synthetic-event surface.
  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(event as React.SubmitEvent<HTMLFormElement>);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Enter") {
      if (
        event.target instanceof HTMLTextAreaElement &&
        !(event.metaKey || event.ctrlKey)
      ) {
        return;
      }

      event.preventDefault();

      if (event.metaKey || event.ctrlKey) {
        handleSubmit(event);
      }
    }
  };

  return (
    <form
      {...rest}
      onSubmit={handleSubmit}
      onKeyDown={onKeyDown ?? handleKeyDown}
      ref={ref}
    />
  );
});

KeyboundForm.displayName = "KeyboundForm";
