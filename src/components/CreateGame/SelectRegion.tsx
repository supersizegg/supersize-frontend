import React from "react";
import "./SelectRegion.scss";

type SelectRegionProps = {
  items: string[];
  onSelect: (selectedItems: string) => void;
  selectedItem: string;
};

const SelectRegion: React.FC<SelectRegionProps> = ({ items, onSelect, selectedItem }) => {
  const handleClick = (item: string) => {
    onSelect(item);
  };

  return (
    <div className="selector-container">
      {items.map((item) => (
        <div
          key={item}
          className={`selector-item ${selectedItem === item ? "selected" : ""}`}
          onClick={() => handleClick(item)}
        >
          <span className={`indicator ${selectedItem === item ? "green" : "red"}`}></span>
          {item}
        </div>
      ))}
    </div>
  );
};

export default SelectRegion;
