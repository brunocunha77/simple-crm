
import React from "react";
import { useAuth } from "@/contexts/auth";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { ArchiveX } from "lucide-react";
import WhatsAppConnectMeta from "@/components/whatsapp/WhatsAppConnectMeta";

interface EmptyStateProps {
  title: string;
  description: string;
  buttonText?: string;
  onButtonClick?: () => void;
}

export function EmptyState({
  title,
  description,
  buttonText,
  onButtonClick,
}: EmptyStateProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArchiveX className="h-5 w-5 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
        {buttonText && onButtonClick && (
          <Button className="mt-4" onClick={onButtonClick}>
            {buttonText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function ConnectWhatsAppState() {
  const { user } = useAuth();
  
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Bem-vindo ao SmartChat, {user?.firstName}</h2>
          <p className="text-muted-foreground">
            Para começar a usar o sistema, conecte sua conta do WhatsApp
          </p>
        </div>
        <div className="flex justify-center py-8">
          <WhatsAppConnectMeta email={user?.email} id={user?.id} />
        </div>
      </section>
    </div>
  );
}
