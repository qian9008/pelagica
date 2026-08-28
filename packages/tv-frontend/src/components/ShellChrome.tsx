import type { ReactNode } from 'react';
import TopBar, { type TopBarItem } from './TopBar';

export default function ShellChrome({
    activeItem,
    children,
}: {
    activeItem?: TopBarItem;
    children: ReactNode;
}) {
    return (
        <div className="flex min-h-svh flex-col">
            <TopBar activeItem={activeItem} />
            <main className="min-w-0 flex-1 p-6 pt-3">{children}</main>
        </div>
    );
}
