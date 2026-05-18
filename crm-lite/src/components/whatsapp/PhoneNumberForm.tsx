
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countryCodes } from "./constants/countryCodes";

interface PhoneNumberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (countryCode: string, ddd: string, phoneNumber: string) => void;
  isLoading: boolean;
}

export const PhoneNumberForm = ({ open, onOpenChange, onSubmit, isLoading }: PhoneNumberFormProps) => {
  const [countryCode, setCountryCode] = useState("+55");
  const [ddd, setDdd] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  const handleSubmit = () => {
    onSubmit(countryCode, ddd, phoneNumber);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Conectar WhatsApp</SheetTitle>
          <SheetDescription>
            Digite o número de telefone que você usa no WhatsApp
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="country-code">País</Label>
            <Select value={countryCode} onValueChange={setCountryCode}>
              <SelectTrigger id="country-code">
                <SelectValue placeholder="Selecione o código do país" />
              </SelectTrigger>
              <SelectContent>
                {countryCodes.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.country} ({country.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="ddd">DDD</Label>
              <Input
                id="ddd"
                value={ddd}
                onChange={(e) => setDdd(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="DDD"
                maxLength={2}
                className="text-center"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="phone-number">Número</Label>
              <Input
                id="phone-number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 9))}
                placeholder="9XXXXXXXX"
                maxLength={9}
              />
            </div>
          </div>

          <Button 
            className="mt-4" 
            onClick={handleSubmit} 
            disabled={isLoading || !ddd || ddd.length < 2 || !phoneNumber || phoneNumber.length < 8}
          >
            {isLoading ? "Processando..." : "Gerar QR Code"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
