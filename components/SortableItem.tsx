
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableItemProps {
    id: string;
    children: React.ReactNode | ((props: { attributes: any; listeners: any }) => React.ReactNode);
    className?: string;
    disabled?: boolean;
    useHandle?: boolean;
}

export const SortableItem: React.FC<SortableItemProps> = ({ id, children, className, disabled, useHandle }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        touchAction: 'none'
    };

    const isRenderProp = typeof children === 'function';

    const renderChildren = () => {
        if (isRenderProp) {
            return (children as (props: { attributes: any; listeners: any }) => React.ReactNode)({ attributes, listeners });
        }
        return children;
    };

    // When using render-prop pattern, the child handles attributes/listeners itself — don't double-bind
    const spreadAttrs = useHandle || isRenderProp ? {} : attributes;
    const spreadListeners = useHandle || isRenderProp ? {} : listeners;

    return (
        <div ref={setNodeRef} style={style} {...spreadAttrs} {...spreadListeners} className={className}>
            {renderChildren()}
        </div>
    );
};
