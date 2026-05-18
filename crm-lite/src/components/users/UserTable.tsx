
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

type Profile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  has_connected_whatsapp: boolean;
  created_at: string;
};

export const UserTable = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*');
        
        if (error) {
          throw error;
        }
        
        setProfiles(data || []);
      } catch (error: any) {
        console.error('Erro ao buscar perfis:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados dos usuários",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [toast]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Usuários Cadastrados</h2>
        <Button
          onClick={() => window.location.reload()}
          disabled={loading}
        >
          {loading ? "Carregando..." : "Atualizar"}
        </Button>
      </div>
      
      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <p>Carregando dados...</p>
        </div>
      ) : profiles.length === 0 ? (
        <div className="h-40 flex items-center justify-center">
          <p>Nenhum usuário cadastrado</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Data de Cadastro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">
                    {profile.first_name} {profile.last_name}
                  </TableCell>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>
                    {profile.has_connected_whatsapp ? (
                      <span className="text-green-600 font-medium">Conectado</span>
                    ) : (
                      <span className="text-red-600 font-medium">Não conectado</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(profile.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default UserTable;
