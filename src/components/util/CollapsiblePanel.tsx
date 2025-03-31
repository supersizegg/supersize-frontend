import React, { useState, useEffect } from 'react';

export interface CollapsiblePanelProps {
  title: React.ReactNode;
  children: React.ReactNode;
  onOpen?: () => void;
  defaultOpen?: boolean;
}

const CollapsiblePanel: React.FC<CollapsiblePanelProps> = ({
  title,
  children,
  onOpen,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    setIsOpen(defaultOpen);
  }, [defaultOpen]);

  const handleToggle = () => {
    if (!isOpen && onOpen) {
      onOpen();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="collapsible-panel">
      <div className="panel-header" onClick={handleToggle}>
        {title} {isOpen ? "▲" : "▼"}
      </div>
      {isOpen && <div className="panel-content">{children}</div>}
    </div>
  );
};

export default CollapsiblePanel;
