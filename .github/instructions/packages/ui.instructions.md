---
applyTo: "packages/ui/**/*.{ts,tsx}"
description: "Shared UI component library patterns and guidelines"
---

# UI Package Instructions

## Overview

The UI package contains shared, reusable UI components used across all frontend applications.

## Technology Stack

- **Framework**: React 19
- **Styling**: Tailwind CSS 4.x
- **UI Base**: Radix UI primitives
- **Icons**: @tabler/icons-react, @medusajs/icons

## Component Structure

### Component Template

```typescript
import { FC, ReactNode } from 'react';
import { cn } from '../utils/cn';

interface ButtonProps {
    children: ReactNode;
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    onClick?: () => void;
    className?: string;
}

export const Button: FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    onClick,
    className,
}) => {
    return (
        <button
            className={cn(
                'rounded-md font-medium transition-colors',
                {
                    'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
                    'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
                    'border border-gray-300 hover:bg-gray-50': variant === 'outline',
                    'px-3 py-1.5 text-sm': size === 'sm',
                    'px-4 py-2 text-base': size === 'md',
                    'px-6 py-3 text-lg': size === 'lg',
                    'opacity-50 cursor-not-allowed': disabled,
                },
                className
            )}
            disabled={disabled}
            onClick={onClick}
        >
            {children}
        </button>
    );
};
```

## Component Categories

### Layout Components

- Container
- Grid
- Stack
- Spacer

### Form Components

- Input
- Textarea
- Select
- Checkbox
- Radio
- Switch

### Feedback Components

- Alert
- Toast
- Loading
- Progress
- Skeleton

### Data Display

- Table
- Card
- Badge
- Avatar
- Tag

### Navigation

- Tabs
- Breadcrumb
- Pagination
- Menu

### Overlay

- Modal
- Dialog
- Popover
- Tooltip
- Dropdown

## Styling with Tailwind

Use Tailwind CSS utility classes with the `cn` utility for conditional classes:

```typescript
import { cn } from '../utils/cn';

const Component = ({ isActive, className }) => {
    return (
        <div className={cn(
            'base-classes',
            isActive && 'active-classes',
            className
        )}>
            Content
        </div>
    );
};
```

## Accessibility

All components must be accessible:

1. **Semantic HTML** - Use appropriate HTML elements
2. **ARIA attributes** - Add when necessary
3. **Keyboard navigation** - Support keyboard interactions
4. **Focus management** - Visible focus indicators
5. **Screen reader support** - Meaningful labels and descriptions

```typescript
export const Input: FC<InputProps> = ({ label, error, ...props }) => {
    const id = useId();
    const errorId = `${id}-error`;

    return (
        <div>
            <label htmlFor={id}>{label}</label>
            <input
                id={id}
                aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
                {...props}
            />
            {error && (
                <span id={errorId} role="alert">
                    {error}
                </span>
            )}
        </div>
    );
};
```

## Component Composition

Design components to be composable:

```typescript
export const Card = ({ children, className }) => (
    <div className={cn('rounded-lg border bg-white shadow', className)}>
        {children}
    </div>
);

Card.Header = ({ children, className }) => (
    <div className={cn('border-b px-6 py-4', className)}>
        {children}
    </div>
);

Card.Body = ({ children, className }) => (
    <div className={cn('px-6 py-4', className)}>
        {children}
    </div>
);

Card.Footer = ({ children, className }) => (
    <div className={cn('border-t px-6 py-4', className)}>
        {children}
    </div>
);

// Usage
<Card>
    <Card.Header>Title</Card.Header>
    <Card.Body>Content</Card.Body>
    <Card.Footer>Actions</Card.Footer>
</Card>
```

## Documentation

Document each component with JSDoc:

````typescript
/**
 * A button component with multiple variants and sizes.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 */
export const Button: FC<ButtonProps> = ({ ... }) => { ... };
````

## Export Pattern

```typescript
// components/index.ts
export { Button } from "./Button";
export { Input } from "./Input";
export { Card } from "./Card";
// ... all components

export type { ButtonProps } from "./Button";
export type { InputProps } from "./Input";
// ... all types
```

## Best Practices

1. **Props interface** - Always define TypeScript interfaces for props
2. **Default props** - Use default values in destructuring
3. **Compound components** - Use for complex components with sub-components
4. **Controlled & uncontrolled** - Support both patterns where applicable
5. **Ref forwarding** - Use forwardRef for components that wrap native elements
6. **Polymorphic components** - Support `as` prop for flexibility
7. **Consistent naming** - Follow naming conventions across all components
8. **Minimal dependencies** - Keep the package lightweight
9. **Tree-shakeable** - Export components individually
10. **Version with care** - Follow semver for breaking changes
