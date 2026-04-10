import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

const SortableDashboardWidget = ({ id, children, isEditMode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    marginBottom: '1.5rem',
  };

  return (
    <div ref={setNodeRef} style={style} data-testid={`sortable-widget-${id}`}>
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          data-testid={`drag-handle-${id}`}
          style={{
            position: 'absolute',
            top: '0.5rem',
            left: '-2rem',
            zIndex: 10,
            cursor: 'grab',
            padding: '0.4rem',
            borderRadius: '6px',
            backgroundColor: 'hsl(var(--primary) / 0.1)',
            border: '1px solid hsl(var(--primary) / 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'hsl(var(--primary))',
            transition: 'all 0.15s ease',
          }}
          title="Arrastra para reordenar"
        >
          <GripVertical size={16} />
        </div>
      )}
      {isEditMode && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          border: '2px dashed hsl(var(--primary) / 0.3)',
          borderRadius: '12px',
          pointerEvents: 'none',
          zIndex: 5,
        }} />
      )}
      {children}
    </div>
  );
};

export default SortableDashboardWidget;
