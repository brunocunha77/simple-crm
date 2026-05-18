import React from "react";
import { BoardProvider } from "./board/context/BoardContext";
import BoardContent from "./board/components/BoardContent";

export default function BoardView() {
  return (
    <div className="h-full flex flex-col min-h-0">
      <BoardContent />
    </div>
  );
}
