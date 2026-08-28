import { forwardRef } from 'react';
import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { useNavigate } from './hooks';
import type { NavigateMode } from './types';

interface RouterLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    to: string;
    mode?: NavigateMode;
}

const RouterLink = forwardRef<HTMLAnchorElement, RouterLinkProps>(
    ({ to, mode, onClick, ...props }, ref) => {
        const navigate = useNavigate();

        const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
            event.preventDefault();
            onClick?.(event);
            navigate(to, { mode });
        };

        return <a ref={ref} href={to} onClick={handleClick} {...props} />;
    }
);
RouterLink.displayName = 'RouterLink';

export default RouterLink;
