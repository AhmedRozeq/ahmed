import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface ThemeNodeData {
    label: string;
    isEditing: boolean;
    onLabelChange: (newLabel: string) => void;
}

const ThemeNode: React.FC<NodeProps<ThemeNodeData>> = ({ data }) => {
    const { label, isEditing, onLabelChange } = data;
    const [inputValue, setInputValue] = useState(label);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setInputValue(label); // Sync with external changes
    }, [label]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleCommit = useCallback(() => {
        if (inputValue.trim() && inputValue.trim() !== label) {
            onLabelChange(inputValue.trim());
        } else {
            // If the value is empty or unchanged, effectively cancel the edit
            onLabelChange(label);
        }
    }, [inputValue, label, onLabelChange]);
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleCommit();
        } else if (e.key === 'Escape') {
            onLabelChange(label); // Cancel edit
        }
    };
    
    return (
        <div 
            style={{
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))',
                color: 'white',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '12px',
                width: 180,
                height: 50,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                boxShadow: '0 6px 10px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                padding: '0 10px'
            }}
        >
            <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
            <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
            {isEditing ? (
                <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onBlur={handleCommit}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-transparent text-white text-center font-bold outline-none border-b-2 border-white/50"
                />
            ) : (
                <div className="truncate">{label}</div>
            )}
        </div>
    );
};

export default ThemeNode;
