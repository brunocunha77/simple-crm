import React, { useState } from "react";

export default function GoogleCalendarTutorialUltraSimple() {
  const [isOpen, setIsOpen] = useState(false);

  void 0;

  return (
    <div className="p-6 border-2 border-red-500 bg-red-50">
      <h2 className="text-xl font-bold mb-4 text-red-700">TESTE ULTRA SIMPLES</h2>
      
      <button 
        onClick={() => {
          void 0;
          setIsOpen(!isOpen);
        }}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        {isOpen ? "Fechar" : "Abrir"} Tutorial
      </button>

      {isOpen && (
        <div className="mt-4 p-4 border-2 border-green-500 bg-green-50">
          <h3 className="font-bold text-green-700 mb-2">🎉 TUTORIAL FUNCIONANDO!</h3>
          <p className="text-green-600">
            Se você está vendo esta mensagem, o useState está funcionando!
          </p>
          <ol className="list-decimal list-inside mt-2 text-sm text-green-600">
            <li>Acesse Google Calendar</li>
            <li>Crie uma nova agenda</li>
            <li>Copie o ID da agenda</li>
          </ol>
        </div>
      )}

      <div className="mt-4 p-2 bg-gray-100 text-xs">
        Estado atual: {isOpen ? "ABERTO" : "FECHADO"}
      </div>
    </div>
  );
}
