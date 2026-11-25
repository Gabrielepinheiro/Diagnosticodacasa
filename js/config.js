// Configuração do aplicativo. É o único arquivo que precisa ser editado para colocar no ar.
// Passo a passo em GUIA.md.

export const CONFIG = {
  // Supabase: Project URL e a chave "anon public" (ou "publishable key").
  // Enquanto ficarem vazios, o app roda em modo de teste: a senha DEMO funciona
  // e as respostas ficam só no navegador.
  supabaseUrl: 'https://lneuhaqbfbgcxbbjlmou.supabase.co',
  // Chave pública (publishable). Pode ficar no site: a segurança está nas regras do banco.
  supabaseKey: 'sb_publishable_xszK5v6eFY7Hia37LxlXaQ_4y7CUNoJ',

  // Perfil do Instagram, sem o @. Aparece na tela da senha e no botão do resultado.
  instagram: 'gabrielepinhheiro',

  // Palavra que a pessoa envia no direct para pedir a senha.
  palavraChave: 'DIAGNÓSTICO',

  // Validade padrão das senhas individuais, em dias.
  validadeDias: 14,
};
