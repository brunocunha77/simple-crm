export const generateRandomPhoneNumber = () => {
  // Gera 8 dígitos aleatórios (X) de 1 a 9
  const randomDigits = Array.from({ length: 8 }, () => 
    Math.floor(Math.random() * 9) + 1
  ).join('');
  
  // Retorna o número no formato 55859XXXXXXXX@s.whatsapp.net
  return `55859${randomDigits}@s.whatsapp.net`;
}; 