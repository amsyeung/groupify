import { useState } from "react";

export default function NavButton({ title, color, onClick, onDrop }: any) {
  const [isOver, setIsOver] = useState(false);

  return (
    <button
      onClick={onClick}
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const tabId = parseInt(e.dataTransfer.getData("tabId"));
        if (tabId) onDrop(tabId);
      }}
      className={`non-selectable px-3 py-1.5 rounded text-[10px] font-semibold tracking-wider transition-all whitespace-nowrap border border-dashed ${
        isOver ? 'scale-110 shadow-lg brightness-110' : 'opacity-80 hover:opacity-100 hover:bg-[#efefef]'
      }`}
      style={{ 
        backgroundColor: `${color}20`, // 20% opacity
        color: color === 'grey' ? '#64748b' : color,
        borderBottomColor: color === 'grey' ? '#64748b' : color
      }}
    >
      {title}
    </button>
  );
}