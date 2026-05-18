import React from "react";
import GoogleCalendarTutorialButton from "./GoogleCalendarTutorialButton";

export default function GoogleCalendarTutorialTest() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Teste do Tutorial da Agenda</h1>
      
      <div className="space-y-2">
        <p>Clique no botão abaixo para testar o tutorial:</p>
        
        <GoogleCalendarTutorialButton>
          Testar Tutorial
        </GoogleCalendarTutorialButton>
      </div>
      
      <div className="space-y-2">
        <p>Ou teste com diferentes variantes:</p>
        
        <div className="flex gap-2">
          <GoogleCalendarTutorialButton variant="outline">
            Outline
          </GoogleCalendarTutorialButton>
          
          <GoogleCalendarTutorialButton variant="secondary">
            Secondary
          </GoogleCalendarTutorialButton>
          
          <GoogleCalendarTutorialButton size="sm">
            Small
          </GoogleCalendarTutorialButton>
        </div>
      </div>
    </div>
  );
}
