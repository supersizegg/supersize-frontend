import React, { useRef } from 'react';

export interface DepositInputProps {
  placeholder?: string;
  defaultValue?: string;
  onCommit: (value: string) => void;
}

const DepositInput: React.FC<DepositInputProps> = React.memo(
  ({ defaultValue = "", placeholder = "tokens to deposit", onCommit }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
      <input
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        style={{ color: "black", marginLeft: "10px" }}
        ref={inputRef}
        onBlur={() => {
          if (inputRef.current) {
            onCommit(inputRef.current.value);
          }
        }}
      />
    );
  }
);

DepositInput.displayName = "DepositInput";

export default DepositInput;
