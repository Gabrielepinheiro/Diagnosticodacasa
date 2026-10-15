// Configuração do aplicativo. É o único arquivo que precisa ser editado para colocar no ar.
// Passo a passo em GUIA.md.

export const CONFIG = {
  // Supabase: Project URL e a chave "anon public" (ou "publishable key").
  // Enquanto ficarem vazios, o app roda em modo de teste: a senha DEMO funciona
  // e as respostas ficam só no navegador.
  supabaseUrl: '',
  supabaseKey: '',

  // Perfil do Instagram, sem o @. Aparece na tela da senha e no botão do resultado.
  instagram: '',

  // Palavra que a pessoa envia no direct para pedir a senha.
  palavraChave: 'DIAGNÓSTICO',

  // Validade padrão das senhas individuais, em dias.
  validadeDias: 14,
};
