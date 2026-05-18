import React from "react";

export default function Header({ title }: { title: string }) {
  return (
    <header className="h-16 flex items-center justify-between px-6 border-b bg-white">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-primary-800 dark:text-white">{title}</h1>
      </div>
    </header>
  );
}
