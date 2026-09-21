import React from 'react';
import { render } from '@react-email/render';

export function renderEmail<P extends object>(
    Component: React.ComponentType<P>,
    props: P
) {
    return render(<Component {...props} />);
}
